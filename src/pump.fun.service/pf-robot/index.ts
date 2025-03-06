import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TradeArchImplRegistry, ITradeArchImpl, BuiltInTradeArchNames, SolanaWalletManager } from "@bots/traider";
import { IPumpFun_TxEventName, IPumpFun_TxEventPayload } from "@bots/traider/impl/pump.fun";
import { PumpFunApi, PumpFunAssetType, PumpFunMaster, PumpFunSlave } from "@bots/traider/impl/pump.fun"
import { IPumpFunRobotConfig } from "./../pf-config";
import TypedEventEmitter, { EventMap } from 'typed-emitter'
import EventEmitter from 'events'
import { IMTCStateSave } from "@bots/traider/mtc";
import { IPumpFunRobotSessionState, stateTransiteMap } from "../pf-robot-service";

import { SlaveDictionary } from "./slave-dict";
import { PFTicker, PFTickerCtx } from "./ticker";

import log from '@utils/logger'
import { CmdOfferBuilder } from "@bots/traider/offer-cmd";

interface IRobot_EvMap extends EventMap {
    message: (msg: string) => void
}

export class PumpFunRobot extends (EventEmitter as new () => TypedEventEmitter<IRobot_EvMap>) {
    private impl: ITradeArchImpl<PumpFunApi, PumpFunAssetType, SolanaWalletManager>
    private api: PumpFunApi
    private master: PumpFunMaster
    private slavesDict: SlaveDictionary

    private state: IPumpFunRobotSessionState

    private ticker: PFTicker
    private tickerCtx: PFTickerCtx

    private transiteState(to: IPumpFunRobotSessionState) {
        if (this.state !== to) {
            if (stateTransiteMap[this.state].includes(to)) {
                this.state = to
                return
            }
        }
        throw new Error(`Can't transite from ${this.state} to ${to}. Invalid state transition`)
    }

    constructor(
        prefix: string,
        asset: PumpFunAssetType,
        private config: IPumpFunRobotConfig,
        sessionSave: IMTCStateSave<PumpFunAssetType>|null = null,
        private dryRun: boolean = false
    ) {
        super()

        this.impl = TradeArchImplRegistry.Instance.get(BuiltInTradeArchNames.PumpDotFun)!
        this.api = this.impl.api.clone()

        if (sessionSave) {
            const { id, tradeAsset, slaves, curve } = sessionSave

            const slaves_count = slaves.length
            const must_be_slaves = this.config.holders.count + this.config.traiders.count + this.config.volatile.count

            if (slaves_count !== must_be_slaves) {
                throw new Error(`Session currapted. Expected ${must_be_slaves} slaves by config, but got ${slaves_count} in session dump`)
            }

            const _slaves = slaves.map(s => {
                return this.impl.stc.clone(
                    s.id, s.metrics, {wallet: s.wallet}
                )
            })

            this.master = this.impl.mtc.clone(
                id, curve, tradeAsset, _slaves
            )

            this.state = 'ready'
        } else {
            this.master = this.impl.mtc.clone(
                `${prefix}_master`,
                null,
                asset
            )

            this.state = "inited"
        }

        this.slavesDict = new SlaveDictionary(this.master)
        this.tickerCtx = new PFTickerCtx(this.impl.walletManager, this.master, this.slavesDict, this.config)
        this.ticker = new PFTicker(this.tickerCtx)
        this.ticker.onmessage = (msg: any) => {
            if (msg instanceof Error) {
                this.emit("message", msg.message)
            } else if (typeof msg === "string") {
                this.emit("message", msg)
            } else {
                log.error("Unknown message type", msg)
            }
        }
    }

    async Initialize() {
        // if there are already slaves, do nothing(load in constructor from session dump)
        if (this.master.slavesCount() > 0) {
            return
        }

        await this.slavesDict.create(this.config.holders.count, "holder", this.impl.walletManager, this.impl.stc)
        await this.slavesDict.create(this.config.traiders.count, "traider", this.impl.walletManager, this.impl.stc)
        await this.slavesDict.create(this.config.volatile.count, "volatile", this.impl.walletManager, this.impl.stc)

        if (!this.dryRun) {
            await this.distribute()
            await this.initialBuy()
        }

        this.transiteState('inited')
    }

    async start() {
        this.transiteState('run')
        if (this.dryRun) {
            return
        }
        await this.subToNotBotTrades((_, tx) => this.tickerCtx.handleOtherTx.bind(this.tickerCtx)(tx))
        this.ticker.run()
    }

    async stop() {
        this.transiteState('end')
        if (this.dryRun) {
            return
        }
        this.ticker.terminate()
        this.api.unsubscribeFromAssetTrades(this.config.targetAsset.mint, this.other_traides_listner_id)
    }

    async pause() {
        this.transiteState('pause')
        if (this.dryRun) {
            return
        }
        this.ticker.pause()
        this.api.unsubscribeFromAssetTrades(this.config.targetAsset.mint, this.other_traides_listner_id)
    }

    async resume() {
        this.transiteState('run')
        if (this.dryRun) {
            return
        }
        await this.subToNotBotTrades((_, tx) => this.tickerCtx.handleOtherTx.bind(this.tickerCtx)(tx))
        this.ticker.resume()
    }

    async sellAll() {
        this.transiteState('end')
        if (this.dryRun) {
            return
        }
        this.ticker.terminate()
        this.api.unsubscribeFromAssetTrades(this.config.targetAsset.mint, this.other_traides_listner_id)

        for (const slave of this.master.Slaves) {
            const balances = await this.impl.walletManager.balance(slave.Wallet)
            const tokens = balances.find(b => b.mint === this.config.targetAsset.mint)
            if (tokens) {
                const offerB = new CmdOfferBuilder()
                offerB
                    .setFee(this.config.fee.priority.feeSol * LAMPORTS_PER_SOL)
                    .setMaxSpent(tokens.amount)
                    .setTraider({wallet: slave.Wallet})
                    .setAsset(this.config.targetAsset)
                const offer = offerB.build()
                slave.pushSell(offer.offer, {...offer})
            }
        }
        await this.master.waitAllSlaveOperations()
        await this.master.collectSlavesNativeCoins(this.config.motherShip)
    }

    toSave() {
        return {
            master: this.master.toSave(),
            state: this.state
        }
    }

    private async distribute() {
        const createDistributeMap = (sols: number, count: number) => {
            const n = count
            const S = sols * LAMPORTS_PER_SOL
            const a1 = S / (n*2)
            const d = (2*S/(n*(n-1)) - 2*a1/(n-1))
            return new Array<bigint>(n).fill(0n).map((_, i) => {
                return BigInt(
                    Math.floor(
                        a1 + d*(i)
                    )
                )
            })
        }

        const motherBalances = await this.impl.walletManager.balance(this.config.motherShip)

        const holdersDistributeSol = this.config.initialBuy.solAmount * this.config.holders.holdAssets.percentFromInfusion / 100
        const traidersDistributeSol = this.config.initialBuy.solAmount - holdersDistributeSol

        const have = this.impl.walletManager.nativeCurrencyBalance(motherBalances)!.amount
        const need = BigInt((holdersDistributeSol + traidersDistributeSol) * LAMPORTS_PER_SOL)

        if (have < need) {
            throw new Error("Not enough balance for initial buy")
        }

        const holderDistribMap = createDistributeMap(holdersDistributeSol, this.config.holders.count)
        const traiderDistribMap = createDistributeMap(traidersDistributeSol, this.config.traiders.count)

        const holdersWallets = this.slavesDict.hodlers.map(s => s.Wallet)
        const traidersWallets = this.slavesDict.traiders.map(s => s.Wallet)

        this.master.distributeNativeCoins(this.config.motherShip, holdersWallets.map((w, i) => ({
            wallet: w,
            amount: holderDistribMap[i]
        })))
        this.master.distributeNativeCoins(this.config.motherShip, traidersWallets.map((w, i) => ({
            wallet: w,
            amount: traiderDistribMap[i]
        })))
        this.transiteState('distribute')
    }

    private async initialBuy() {
        const __initBuy = async (slaves: PumpFunSlave[], balanceRestSol: number) => {
            const wait_ids: string[] = []
            for (const slave of slaves) {
                const balance = await this.impl.walletManager.balance(slave.Wallet)
                const nativeBalance = this.impl.walletManager.nativeCurrencyBalance(balance)!.amount
                log.info(`Slave ${slave.id} balance: ${nativeBalance}lamports\t${Number(nativeBalance)/LAMPORTS_PER_SOL}sol`)

                const assets = balance.find(b => b.mint == this.config.targetAsset.mint)!.amount
                log.info(`Slave ${slave.id} asset balance:`, assets)

                const spent = nativeBalance - BigInt(balanceRestSol)*BigInt(LAMPORTS_PER_SOL)
                wait_ids.push(
                    slave.pushBuy({
                        asset: this.config.targetAsset,
                        maxSpent: spent,
                        slippagePerc: this.config.slippage.percent,
                        fee: this.config.fee.priority.feeSol,
                    })
                )
            }
            return wait_ids
        }

        const holders = this.slavesDict.hodlers
        const traiders = this.slavesDict.traiders

        log.info(`Initial buy for ${holders.length} holders and ${traiders.length} traiders`)
        const holders_wait_ids = await __initBuy(holders,
            this.config.holders.resetAmountSol + this.config.globalBalance.restAmountSol)
        // REMOVED due to current version only supports volatile trades from tmp accounts
        //const traiders_wait_ids = await __initBuy(traiders,
        //    this.config.traiders.resetAmountSol + this.config.globalBalance.restAmountSol)

        const promises = holders_wait_ids.concat(/*traiders_wait_ids*/).map(async (id) => {
            return this.master!.waitSlaveOperation(id).then(err => {
                if (err) {
                    log.error(`PumpFunTradeService.initialBuy() waitSlaveOperation error: ${err}`)
                    throw new Error(`On operation initialBuy on slave error occured`)
                }
            })
        })
        await Promise.all(promises)
        this.transiteState('initial_buy')
    }

    private other_traides_listner_id = -1

    private async subToNotBotTrades(fn: (e: IPumpFun_TxEventName, tx: IPumpFun_TxEventPayload) => void) {
        if (this.other_traides_listner_id >= 0) {
            throw new Error("PumpFunTradeService.subToNotBotTrades() called when already subscribed")
        }

        const filterNotBotTrades = (sign: string) => {
            return !this.master.slavesMetrics().Trades.map(t => t.signature).includes(sign)
        }
        
        // @since: 0.0.1v. if use pumpfun_streaming_api need to save pass function link to remove listner :)
        this.other_traides_listner_id = await this.api.subscribeToAssetTrades(this.config.targetAsset.mint, async (event, tx: IPumpFun_TxEventPayload) => {
            if (!filterNotBotTrades(tx.mint.toString())) {
                return
            }

            fn(event, tx)
        })
    }

}

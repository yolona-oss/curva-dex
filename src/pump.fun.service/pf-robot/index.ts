import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TradeArchImplRegistry, ITradeArchImpl, BuiltInNames, SolanaWalletManager, TradeSideType, BaseWalletManager } from "@bots/traider";
import { IPumpFun_TxEventName, IPumpFun_TxEventPayload } from "@bots/traider/impl/pump.fun";
import { PumpFunApi, PumpFunAssetType, PumpFunMaster, PumpFunSlave } from "@bots/traider/impl/pump.fun"
import { MTC_OfferBuilder } from "@bots/traider/mtc-offer-builder";

import { randomizeWithScatter } from "@core/utils/random";
import log from '@utils/logger'
import { IBCPS_Config } from "./../pf-config";
import EventEmitter from "events";
import { IMTCStateSave } from "@bots/traider/mtc";
import { IPumpFunRobotSessionState } from "../pf-robot-service";

import { SlaveDictionary } from "./slave-dict";

export class PumpFunRobot extends EventEmitter {
    private impl: ITradeArchImpl<PumpFunApi, PumpFunAssetType, SolanaWalletManager>
    private master: PumpFunMaster
    private slavesDict: SlaveDictionary

    private state: IPumpFunRobotSessionState

    constructor(
        prefix: string,
        asset: PumpFunAssetType,
        private config: IBCPS_Config,
        sessionSave?: IMTCStateSave<PumpFunAssetType>|null
    ) {
        super()

        this.impl = TradeArchImplRegistry.Instance.get(BuiltInNames.PumpDotFun)!

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
        } else {
            this.master = this.impl.mtc.clone(
                `${prefix}_master`,
                null,
                asset
            )
        }

        this.slavesDict = new SlaveDictionary(this.master)

        this.state = "inited"
    }

    async Initialize() {
        // if there are already slaves, do nothing(load in constructor from session dump)
        if (this.master.slavesCount() > 0) {
            return
        }

        await this.slavesDict.create(this.config.holders.count, "holder", this.impl.walletManager, this.impl.stc)
        await this.slavesDict.create(this.config.traiders.count, "traider", this.impl.walletManager, this.impl.stc)
        await this.slavesDict.create(this.config.volatile.count, "volatile", this.impl.walletManager, this.impl.stc)
    }

    async distribute() {
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
    }

    async collectFromAll() {
        await this.master.collectSlavesNativeCoins(this.config.motherShip)
    }

    async initialBuy() {
        const __initBuy = async (slaves: PumpFunSlave[], balanceRestSol: number) => {
            const wait_ids: string[] = []
            for (const slave of slaves) {
                const balance = await this.impl.walletManager.balance(slave.Wallet)
                const nativeBalance = this.impl.walletManager.nativeCurrencyBalance(balance)!.amount
                log.echo(`Slave ${slave.id} balance: ${nativeBalance}lamports\t${Number(nativeBalance)/LAMPORTS_PER_SOL}sol`)

                const assets = balance.find(b => b.mint == this.config.targetAsset.mint)!.amount
                log.echo(`Slave ${slave.id} asset balance:`, assets)

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

        log.echo(`Initial buy for ${holders.length} holders and ${traiders.length} traiders`)
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
        this.other_traides_listner_id = await this.impl.api.subscribeToAssetTrades(this.config.targetAsset.mint, async (event, tx: IPumpFun_TxEventPayload) => {
            if (!filterNotBotTrades(tx.mint.toString())) {
                return
            }

            fn(event, tx)
        })
    }

    // TRIGERS:
    //  Curve(bots/full):
    //      Trend: (up, down, flat), (X% max_diff/X max_diff), (duration)
    //      Progress: (X% progress)
    //      Complete
    //      
    //  Liquidity:
    //      
    //  Price:
    //      

    async terminateImitateTxs() {
        if (this.other_traides_listner_id >= 0) {
            this.impl.api.unsubscribeFromAssetTrades(this.config.targetAsset.mint, this.other_traides_listner_id)
        }
        if (this.volatileTickTimer) {
            clearInterval(this.volatileTickTimer)
        }
        await this.master.terminate()
    }

    private volatileTickTimer?: NodeJS.Timeout

    async imitateTxs() {
        //const now = Date.now()
        //this.master.FullCurve.getTrends({timeCut: { offset: now - 1000*60, limit: now }})

        await this.subToNotBotTrades((_, tx) => {
            tx
        })

        this.volatileTickTimer = setInterval(this.volatileTick, 1000)
    }

    // TOOO BIG
    private async perforVolatile(slave: PumpFunSlave) {
        const assetInfo = await this.master.assetInfo()
        const price = assetInfo!.price
        const native = await this.master.getSalveBalanceNative(slave.id)
        const assets = await this.master.getSlaveBalanceForAsset(slave.id, this.config.targetAsset.mint)

        const tradesPerformed = slave.metrics().Trades.length
        if (tradesPerformed === 0) {
            const amount = randomizeWithScatter(
                this.config.volatile.initialBalanceSol,
                this.config.volatile.balanceScatter,
                0)
            await this.impl.walletManager.distribute(this.config.motherShip, [{
                wallet: slave.Wallet,
                amount: BigInt(amount * LAMPORTS_PER_SOL)
            }])
        }

        const rand = Math.random()
        const lastTxSide = slave.metrics().lastTrade?.side ?? "BUY"
        const Weight = 0.1
        let SideInd = Math.round(rand + Weight * (lastTxSide == "BUY" ? 1 : -1))

        if (SideInd < 0) {
            SideInd = 0
        } else if (SideInd > 1) {
            SideInd = 1
        }

        const canBuyAssets = price * native.amount
        const canSellAssets = assets?.amount || 0n
        let side: TradeSideType = SideInd == 0 ? "BUY" : "SELL"

        const lifeCicleTrades = 10n
        const minBuyAsset = BigInt(LAMPORTS_PER_SOL * 0.005)
        const minSellAsset = BigInt(LAMPORTS_PER_SOL * 0.005)

        const minSelValue = side == "BUY" ? minBuyAsset : minSellAsset
        const canTradeValue = side == "BUY" ? canBuyAssets : canSellAssets
        const willSpentValue = canTradeValue / lifeCicleTrades // TODO reduce by trade number, but think about balances rest that simple handles by V this if/else
            - BigInt(LAMPORTS_PER_SOL * this.config.globalBalance.restAmountSol)

        // SIDE SWITCH OR VOLATILE CYCLE DONE
        if (minSelValue > willSpentValue) {
            if (side == "BUY") {
                if (assets && assets.amount > minBuyAsset) {
                    side = "SELL"
                } else {
                    return {done: true}
                }
            } else {
                // if balance anought for buying
                if (native.amount > price * minSellAsset) {
                    side = "BUY"
                } else {
                    return {done: true}
                }
            }
        }

        const builder = new MTC_OfferBuilder()
        builder
            .setVerificationBalance(false)
            .offerBuilder
                .setMaxSpent(willSpentValue)
                .setFee(this.config.fee.priority.feeSol)
                .setAsset(this.config.targetAsset)
                .setTraider({wallet: slave.Wallet})
        const opt = builder.build()
        try {
            const res = await this.master.performTrade(slave.id, side, opt)
            if (res instanceof Error) {
                throw res
            } else {
                if (!res.success) {
                    throw new Error("[volatile]Tx " + res.signature + " failed")
                }
            }
        } catch(e: any) {
            this.emit("message", e.message)
        }
        return {done: false}
    }

    private async handleVolatileDone(slave: PumpFunSlave) {
        await this.impl.walletManager.collect([slave.Wallet], this.config.motherShip)
        await this.master.removeSlave(slave)
    }

    private async volatileTick() {
        for (const slave of this.slavesDict.volatile) {
            const lastTradeTime = slave.metrics().lastTrade?.time ?? 0
            const interval = randomizeWithScatter<number>(this.config.volatile.period, this.config.volatile.periodScatter, 0)
            if (Date.now() - lastTradeTime > interval) {
                const { done } = await this.perforVolatile(slave)
                if (done) {
                    await this.handleVolatileDone(slave)
                    setTimeout(
                        () => this.slavesDict.create(1, "volatile", this.impl.walletManager, slave),
                        this.config.volatile.rechargeTime
                    )
                }
            }
        }
    }

    toSave() {
        return this.master.toSave()
    }
}

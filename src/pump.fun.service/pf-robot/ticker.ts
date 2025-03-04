import { AbstractTTickerCtx, BaseTTickerState, BaseWalletManager, BuiltInTradeArchNames, TradeArchImplRegistry, TradeSideType, TTicker } from "@bots/traider";
import { IPumpFun_TxEventPayload, PumpFunMaster, PumpFunSlave } from "@bots/traider/impl/pump.fun";
import { SlaveDictionary } from "./slave-dict";
import { randomizeWithScatter } from "@core/utils/random";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MTC_OfferBuilder } from "@bots/traider/mtc-offer-builder";
import { IPumpFunRobotConfig } from "../pf-config";
import { writeJsonData } from "@core/utils/fs";

type PerformTradeRet = {
    done: boolean
}

export class DummyState extends BaseTTickerState {
    async performTrade(slave: PumpFunSlave, master: PumpFunMaster): Promise<PerformTradeRet> {
        slave; master;
        return {done: false}
    }

    async handleDone(slave: PumpFunSlave, master: PumpFunMaster) {
        slave;master;
    }

    async addBalance(slave: PumpFunSlave, amount: number): Promise<void> {
        const impl = TradeArchImplRegistry.Instance.get(BuiltInTradeArchNames.PumpDotFun)!
        await impl.walletManager.distribute(this.config.motherShip, [{
            wallet: slave.Wallet,
            amount: BigInt(amount * LAMPORTS_PER_SOL)
        }])
    }

    public onmessage = (_: any) => {}

    constructor(protected config: IPumpFunRobotConfig) {
        super()
    }
}

export class VolatileTraider extends DummyState {
    constructor(cfg: IPumpFunRobotConfig) {
        super(cfg)
    }

    async handleDone(slave: PumpFunSlave, master: PumpFunMaster): Promise<void> {
        const tokens = await master.getSlaveBalanceForAsset(slave.id, this.config.targetAsset.mint)
        const base_fee_lamp = this.config.fee.priority.feeSol * LAMPORTS_PER_SOL
        const tokenInfo = (await master.assetInfo())

        // if tokens in balance are more than base fee to pay
        if (tokenInfo && tokens && (tokens.amount * tokenInfo.price) > base_fee_lamp) {
            const builder = new MTC_OfferBuilder()
            builder
                .setVerificationBalance(false)
                .offerBuilder
                    .setMaxSpent(tokens.amount)
                    .setFee(base_fee_lamp)
                    .setSlippagePerc(this.config.slippage.percent)
                    .setAsset(this.config.targetAsset)
            const offer = builder.build()
            const res = await master.performTrade(slave.id, "SELL", offer)
            if (res instanceof Error) {
                this.onmessage("Error: " + res.message)
            }
        }

        const slaveState = slave.toSave()
        writeJsonData(['volatile-dump', new Date().toISOString()], slave.id, slaveState)

        await master.collectNativeFromSlave(slave, this.config.motherShip)
        await master.removeSlave(slave)
    }

    async performTrade(slave: PumpFunSlave, master: PumpFunMaster): Promise<PerformTradeRet> {
        const mint = this.config.targetAsset.mint
        const assetInfo = await master.assetInfo()
        const price = assetInfo!.price
        const native = await master.getSalveBalanceNative(slave.id)
        const assets = await master.getSlaveBalanceForAsset(slave.id, mint)

        const tradesPerformed = slave.metrics().Trades.length
        if (tradesPerformed === 0) {
            const amount = randomizeWithScatter(
                this.config.volatile.initialBalanceSol,
                this.config.volatile.balanceScatter,
                0)
            await this.addBalance(slave, amount)
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
        const minBuyAsset = BigInt(LAMPORTS_PER_SOL * 0.0005)
        const minSellAsset = BigInt(LAMPORTS_PER_SOL * 0.0005)

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
            const res = await master.performTrade(slave.id, side, opt)
            if (res instanceof Error) {
                throw res
            } else {
                if (!res.success) {
                    throw new Error("[volatile]Tx " + res.signature + " failed")
                }
            }
        } catch(e: any) {
            this.onmessage(e)
        }
        return {done: false}
    }
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

export class CommonTraider extends DummyState {

}

export class HolderTraider extends DummyState {

}

export class PFTickerCtx extends AbstractTTickerCtx<DummyState> {
    constructor(
        private wm: BaseWalletManager,
        private master: PumpFunMaster,
        private slavesDict: SlaveDictionary,
        private config: IPumpFunRobotConfig
    ) {
        super(new DummyState(config))

        this.states = {
            dummy: new DummyState(config),
            volatile: new VolatileTraider(config),
            holder: new HolderTraider(config),
            traider: new CommonTraider(config)
        }
    }

    protected states: {
        dummy: DummyState
        volatile: VolatileTraider
        holder: HolderTraider
        traider: CommonTraider
    }

    toVolatile() {
        this.states.volatile.onmessage = this.onmessage
        this.transitionTo(this.states.volatile)
    }

    toTraider() {
        this.states.traider.onmessage = this.onmessage
        this.transitionTo(this.states.traider)
    }

    toHolder() {
        this.states.holder.onmessage = this.onmessage
        this.transitionTo(this.states.holder)
    }

    toDummy() {
        this.states.dummy.onmessage = this.onmessage
        this.transitionTo(this.states.dummy)
    }

    async volatile() {
        this.toVolatile()
        for (const slave of this.slavesDict.volatile) {
            const lastTradeTime = slave.metrics().lastTrade?.time ?? 0
            const interval = randomizeWithScatter<number>(this.config.volatile.period, this.config.volatile.periodScatter, 0)
            if (Date.now() - lastTradeTime > interval) {
                const { done } = await this.state.performTrade(slave, this.master)
                if (done) {
                    await this.state.handleDone(slave, this.master)
                    setTimeout(
                        () => this.slavesDict.create(1, "volatile", this.wm, slave),
                        this.config.volatile.rechargeTime
                    )
                }
            }
        }
    }

    async holder() {
        this.toHolder()
    }

    async traider() {
        this.toTraider()
    }

    async handleOtherTx(tx: IPumpFun_TxEventPayload) {
        tx
    }

    async tick() {
        await this.volatile()
        await this.traider()
        await this.holder()
    }

    async exit() {

    }
}

export class PFTicker extends TTicker {
    onmessage = (_: any) => {}

    constructor(ctx: PFTickerCtx) {
        super(ctx)
        this.ctx.onmessage = this.onmessage
    }
}

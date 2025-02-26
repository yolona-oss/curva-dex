import { Identificable } from "@core/types/identificable";
import { IRunnable } from "@core/types/runnable";
import log from "@utils/logger";
import { sleep, timeoutPromise } from "@utils/time";
import { Sequalizer } from "@utils/sequalizer";

import { SlaveTraderCtrl } from "./stc";
import { ISTCMetrics } from "./stc-metric";
import { BaseTradeApi } from "./base-trade-api";
import { ITradeCommit, TradeSideConst, TradeSideType } from "./types/trade";
import { BotDrivenCurve } from "./bot-driven-curve";
import { IBaseTradeAsset } from "./types/asset";
import { IDEXWallet } from "./types/wallet";
import { BaseWalletManager } from "./wallet-manager";
import { intersect, isUnique } from "@utils/array";
import { ALLOW_SLAVE_WALLET_DUPS } from "./constants";
import { IMTC_OfferOpts } from "./mtc-offer-builder";
import { OfferVerifier } from "./offer-cmd";
import { BLANK_MINT_PREFIX } from "./impl/built-in";

// NOTE: maybe create additional classes for master slave control logic like addition/removal, trades etc?

export abstract class MasterTraderCtrl<
        TradeApi extends BaseTradeApi<AssetType> = BaseTradeApi<any>,
        AssetType extends IBaseTradeAsset = IBaseTradeAsset,
        WMType extends BaseWalletManager = BaseWalletManager
    >
    implements
        IRunnable,
        Identificable
{
    private _isRunning: boolean = false
    protected sharedSequalizer: Sequalizer

    protected botDrivenCurve: BotDrivenCurve
    protected fullCurve: BotDrivenCurve
    private bots_curve_id
    private full_curve_id

    constructor(
        public readonly tradeAsset: AssetType,
        protected slaves: Array<SlaveTraderCtrl<TradeApi, AssetType>>,
        protected tradeApi: TradeApi,
        protected owner: string,
        protected walletMngr: WMType,
        public readonly id: string = "id_mtc_main"
    ) {
        this.sharedSequalizer = new Sequalizer()

        for (const slave of this.slaves) {
            this.applySlaveToMaster(slave)
        }

        this.bots_curve_id = `${owner}_${this.id}_${this.tradeApi.id}_${this.tradeAsset.symbol}_bots_curve`
        this.full_curve_id = `${owner}_${this.id}_${this.tradeApi.id}_${this.tradeAsset.symbol}_full_curve`

        if (tradeAsset.mint !== BLANK_MINT_PREFIX) {
            log.echo(`bots_curve_id: ${this.bots_curve_id}`)
            log.echo(`full_curve_id: ${this.full_curve_id}`)
            this.botDrivenCurve = BotDrivenCurve.loadFromFile(this.owner, this.bots_curve_id)
            this.fullCurve = BotDrivenCurve.loadFromFile(this.owner, this.bots_curve_id)
        } else {
            this.botDrivenCurve = new BotDrivenCurve(this.owner)
            this.fullCurve = new BotDrivenCurve(this.owner)
        }
    }

    public isRunning(): boolean {
        return this._isRunning
    }

    abstract clone(newId: string, newOwner: string, newAsset: AssetType, newSlaves?: SlaveTraderCtrl<TradeApi, AssetType>[]): MasterTraderCtrl<TradeApi, AssetType, WMType>

    abstract onTrade<TxData>(ev: string, trade: TxData): Promise<void>

    private onSlaveSell(awaited_id: string, trade: ITradeCommit<AssetType>) {
        awaited_id
        this.botDrivenCurve.addTrade({
            sign: trade.signature,
            price: trade.assetPrice,
            quantity: trade.out,
            side: TradeSideConst.Sell,
            time: Date.now()
        })
    }

    private onSlaveBuy(awaited_id: string, trade: ITradeCommit<AssetType>) {
        awaited_id
        this.botDrivenCurve.addTrade({
            sign: trade.signature,
            price: trade.assetPrice,
            quantity: trade.in,
            side: TradeSideConst.Buy,
            time: Date.now()
        })
    }

    public async distributeNativeCoins(mother: IDEXWallet, destinations: {wallet: IDEXWallet, amount: bigint}[]) {
        const slavesPubKeys = this.slaves.map(s => s.Wallet.publicKey)
        const destsPubKeys = destinations.map(d => d.wallet.publicKey)

        if (!isUnique(destsPubKeys)) {
            throw new Error("Destinations must be unique")
        }

        const intersection = intersect(slavesPubKeys, destsPubKeys)

        if (intersection.length < destsPubKeys.length) {
            throw new Error("Some destinations are not slaves")
        }
        return await this.walletMngr.distribute(mother, destinations)
    }

    public async collectSlavesNativeCoins(to: IDEXWallet) {
        const slavesWallets = this.slaves.map(s => s.Wallet)
        return await this.walletMngr.collect(slavesWallets, to)
    }

    public async getSalveBalanceNative(slave_id: string) {
        const slave = this.findSlaveByIdOrThrow(slave_id)
        const balances = await this.walletMngr.balance(slave.Wallet)

        return balances.find(b => b.mint === this.walletMngr.nativeCurrency) ?? {amount: 0n, mint: this.walletMngr.nativeCurrency}
    }

    public async getSlaveBalanceForAsset(slave_id: string, mint: string) {
        const slave = this.findSlaveByIdOrThrow(slave_id)
        const balances = await this.walletMngr.balance(slave.Wallet)

        return balances.find(b => b.mint === mint)
    }

    public async pushTradeToQueue(slave_id: string, side: TradeSideType, config: IMTC_OfferOpts<TradeApi, AssetType>): Promise<string|Error> {
        const slave = this.findSlaveByIdOrThrow(slave_id)

        const cmdOpts = config.cmdOpts
        const offer = cmdOpts.offer

        // TODO : add slipage and fee check
        if (config.slaveVerification.balance) {
            const err = await OfferVerifier.verifyBalance(slave_id, this, offer, side)
            if (err) {
                return new Error(OfferVerifier.verifyErrorToError(err))
            }
        }
        if (config.slaveVerification.condition) {
            const cond = config.slaveVerification.condition
            const err = await cond(this, slave)
            if (err) {
                return new Error(OfferVerifier.verifyErrorToError(err))
            }
        }

        const fn = side === TradeSideConst.Buy ? slave.pushBuy : slave.pushSell
        return fn(offer, {
            exe: cmdOpts.exe,
            decline: cmdOpts.decline,
            setup: cmdOpts.setup
        })
    }

    public async performTrade(slave_id: string, side: TradeSideType, config: IMTC_OfferOpts<TradeApi, AssetType>, timeout = 60 * 1000): Promise<ITradeCommit<AssetType>|Error> {
        const slave = this.findSlaveByIdOrThrow(slave_id)

        const tradePushRes = await this.pushTradeToQueue(slave_id, side, config)
        if (tradePushRes instanceof Error) {
            return tradePushRes
        }
        const wait_id = tradePushRes
        const sideToEvent = side === TradeSideConst.Buy ? 'buy' : 'sell'

        const wait_commit_promise = new Promise<ITradeCommit<AssetType>>(response => {
            function verifyWaitId(awaited_id: string, commit: ITradeCommit<AssetType>): ITradeCommit<AssetType>|null {
                if (awaited_id === wait_id) {
                    return commit
                }
                return null
            }

            const evHandler = (id: string, commit: ITradeCommit<AssetType>) => {
                const is_commit = verifyWaitId(id, commit)
                if (is_commit !== null) {
                    slave.off(sideToEvent, evHandler)
                    response(is_commit)
                }
            }
            slave.on(sideToEvent, evHandler)
        })

        try {
            const res = await Promise.race([
                timeoutPromise(timeout),
                wait_commit_promise
            ])
            return res
        } catch(e) {
            this.sharedSequalizer.unenqueue(wait_id)
            throw e
        }
    }

    get Slaves() {
        return this.slaves
    }

    get WalletManager() {
        return this.walletMngr
    }

    getSlaveBySign(sign: string): SlaveTraderCtrl<TradeApi, AssetType> | undefined {
        return this.slaves.find(s => s.id === sign)
    }

    get FullCurve() {
        return this.fullCurve
    }

    get BotDrivenCurve() {
        return this.botDrivenCurve
    }

    private isPubKeyDuplicant(wallet: IDEXWallet) {
        return Boolean(this.slaves.find(s => s.Wallet.publicKey == wallet.publicKey))
    }

    private throwIfDupsNotAllowed(wallet: IDEXWallet) {
        if (!ALLOW_SLAVE_WALLET_DUPS && this.isPubKeyDuplicant(wallet)) {
            throw new Error("Slave wallet duplicants not allowed")
        }
    }

    private createSlaveId(sign: string) {
        return `master_${this.id}_owner_${this.owner}_${sign}_slave_id`
    }

    private applySlaveToMaster(slave: SlaveTraderCtrl<TradeApi, AssetType>) {
        slave.on('sell', this.onSlaveSell.bind(this))
        slave.on('buy', this.onSlaveBuy.bind(this))
        slave.setSequalizer(this.sharedSequalizer)
    }

    createAndApplySlave(clonable: SlaveTraderCtrl<TradeApi, AssetType>, sign: string, wallet: IDEXWallet) {
        this.throwIfDupsNotAllowed(wallet)
        const newId = this.createSlaveId(sign)
        const slave = clonable.clone(newId, this.owner, {wallet}, this.sharedSequalizer)
        this.applySlaveToMaster(slave)
        this.addSlave(slave)
        return slave
    }

    /**
    * TODO: create more opts to slave addiction to master
    * @argument replaceIdWithSign - if not empty, will replace slave id with this sign and current master id-creation logic. BUT SKIP ALL METRICS!
    */
    addSlave(__slave: SlaveTraderCtrl<TradeApi, AssetType>, replaceIdWithSign: string = "") {
        this.throwIfDupsNotAllowed(__slave.Wallet)

        let slaveReplicant = __slave
        if (replaceIdWithSign != "") {
            // NOTE: metrics will be lost
            slaveReplicant = __slave.clone(this.createSlaveId(replaceIdWithSign), this.owner, {wallet: __slave.Wallet}, this.sharedSequalizer)
        }


        this.applySlaveToMaster(slaveReplicant)
        this.slaves.push(slaveReplicant)
        return this
    }

    async filterSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, AssetType>) => Promise<boolean>): Promise<{
        removedCount: number,
        kept: Array<SlaveTraderCtrl<TradeApi, AssetType>>
    }> {
        let removed = []
        let kept = []
        for (const slave of this.slaves) {
            if (await fn(slave)) {
                kept.push(slave)
            } else {
                removed.push(slave)
            }
        }

        for (const toRemove of removed) {
            await this.removeSlaveByWallet(toRemove.Wallet)
        }

        return {
            removedCount: removed.length,
            kept: kept
        }
    }

    public async removeSlave(slave: SlaveTraderCtrl<TradeApi, AssetType>) {
        await slave.shutdown()
        const del = this.slaves.splice(this.slaves.indexOf(slave), 1)
        if (del.length !== 1) {
            throw new Error(`MasterTraderCtrl::removeSlave() slave with id: "${slave.id}" not found`)
        }
        log.echo(`MasterTraderCtrl::removeSlave() removed slave ${slave.id}`)
    }

    public async removeSlaveByWallet(wallet: IDEXWallet) {
        const slaveToRemove = this.slaves.find(s => s.Wallet.publicKey === wallet.publicKey && s.Wallet.secretKey === wallet.secretKey)
        if (slaveToRemove) {
            const searchId = slaveToRemove.id
            await slaveToRemove.shutdown()

            this.slaves = this.slaves.filter(s => s.id !== searchId)
            log.echo(`MasterTraderCtrl::removeSlave() removed slave ${searchId}`)
        } else {
            log.error(`MasterTraderCtrl::removeSlave() slave with pubKey: "${wallet.publicKey}" not found`)
        }
    }

    public findSlaveById(id: string) {
        return this.slaves.find(s => s.id === id)
    }

    public findSlaveByIdOrThrow(id: string) {
        const slave = this.slaves.find(s => s.id === id)
        if (!slave) {
            throw new Error(`MasterTraderCtrl::findSlaveByIdOrThrow() slave with id: "${id}" not found`)
        }
        return slave
    }

    public findSlaveByWallet(wallet: IDEXWallet) {
        return this.slaves.find(s => s.Wallet.publicKey === wallet.publicKey && s.Wallet.secretKey === wallet.secretKey)
    }

    public async applyToSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, AssetType>, index: number) => Promise<void>) {
        for (let i = 0; i < this.slaves.length; i++) {
            await fn(this.slaves[i], i)
        }
    }

    //public async loadOfferSequenceToSlave(
    //    offers: (IOffer&{side: TradeSideType})[],
    //    slaveSearch: (s: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>) => boolean
    //): Promise<{
    //    loaded: boolean,
    //    error?: string
    //}> {
    //    let slave = this.slaves.find(slaveSearch)
    //    if (!slave) {
    //        throw new Error("MasterTraderCtrl::loadOfferSequenceToSlave() slave not found")
    //    }
    //
    //    const canPerform = await slave.canPerformTradeSequence(offers)
    //    if (!canPerform) {
    //        return {
    //            loaded: false,
    //            error: "SlaveTraderCtrl::loadOfferSequenceToSlave() slave can't perform trade sequence"
    //        }
    //    }
    //
    //    //slave.pushOffer(offers)
    //
    //    return {
    //        loaded: true
    //    }
    //}

    public async assetInfo() {
        return await this.tradeApi.assetInfo(this.tradeAsset)
    }

    public slavesCount() {
        return this.slaves.length
    }

    async run() {
        this._isRunning = true
        this.sharedSequalizer.run()

        const interval = 100

        while (this._isRunning) {
            const start = performance.now()

            sleep(interval)

            const end = performance.now()
            const delta = end - start

            if (delta < interval) {
                await sleep(interval - delta)
            }
        }
    }

    async terminate() {
        console.log("MTC DONE")
        this._isRunning = false
        this.botDrivenCurve.saveToFile(this.bots_curve_id)
        this.fullCurve.saveToFile(this.full_curve_id)
        await this.sharedSequalizer.waitAll()
        await this.sharedSequalizer.terminate()
        for (const slave of this.slaves) {
            await slave.shutdown()
        }
    }

    public async waitSlaveOperation(opId: string) {
        return await this.sharedSequalizer.waitTask(opId)
    }

    slavesMetrics() {
        return this.agregateMetrics(this.slaves.map(s => s.metrics()))
    }

    private agregateMetrics(slaveMetrics: Array<ISTCMetrics>,
        initial: ISTCMetrics = {
            Trades: [],
            SuccessTrades: [],
            SellTrades: [],
            BuyTrades: [],
            ErrorTrades: [],
            ErrorRate: 0,
            BuyMeanPrice: 0n,
            SellMeanPrice: 0n,
            AssetTradeVolume: 0n,
            PrimCurrencyTradeVolume: 0n,
            SpentOnAsset: 0n,
            GainOnAsset: 0n,
            SpentOnFee: 0n,
            DropedTradesCount: 0
        }): ISTCMetrics {
        let dmetrics: ISTCMetrics = Object.assign({}, initial)

        const concatMetrics = (src: ISTCMetrics, dst: ISTCMetrics) => {
            dst.Trades = dst.Trades.concat(src.Trades)
            dst.SuccessTrades = dst.SuccessTrades.concat(src.SuccessTrades)
            dst.SellTrades = dst.SellTrades.concat(src.SellTrades)
            dst.BuyTrades = dst.BuyTrades.concat(src.BuyTrades)
            dst.ErrorTrades = dst.ErrorTrades.concat(src.ErrorTrades)
            dst.ErrorRate = dst.ErrorRate + src.ErrorRate
            dst.BuyMeanPrice = dst.BuyMeanPrice + src.BuyMeanPrice
            dst.SellMeanPrice = dst.SellMeanPrice + src.SellMeanPrice
            dst.AssetTradeVolume = dst.AssetTradeVolume + src.AssetTradeVolume
            dst.PrimCurrencyTradeVolume = dst.PrimCurrencyTradeVolume + src.PrimCurrencyTradeVolume
            dst.SpentOnAsset = dst.SpentOnAsset + src.SpentOnAsset
            dst.GainOnAsset = dst.GainOnAsset + src.GainOnAsset
            dst.SpentOnFee = dst.SpentOnFee + src.SpentOnFee
            dst.DropedTradesCount = dst.DropedTradesCount + src.DropedTradesCount
        }

        slaveMetrics.forEach((smetric) => {
            concatMetrics(smetric, dmetrics)
        })
        return dmetrics
    }
}

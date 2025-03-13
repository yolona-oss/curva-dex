import { Identificable } from "@core/types/identificable";
import { Sequalizer } from "@utils/sequalizer";
import { HMSTime } from "@utils/time";
import { Cloner } from "@utils/cloner";
import logger from '@logger';

import { ITradeCommit, IOffer, TradeSideConst, TradeSideType } from "./types/trade";
import { IDEXWallet } from "./types/wallet";
import { ITraider } from "./types/traider";
import { IBaseTradeAsset } from "./types/asset";

import { BaseTradeApi } from "./base-trade-api";
import { STCMetrics, ISTCMetrics, ISTCMetricsSave } from "./stc-metric";

import { OfferCmd, ICmdPushOfferOpts } from "./offer-cmd"
import { BaseWalletManager } from "./wallet-manager";

import { BLANK_WALLET_OBJ } from './impl/built-in'
import { EventEmitter } from "events";
import { WithExecTime } from "@core/types/with-exec-time";
import { MasterTraderCtrl } from "./mtc";

export type CheckPerformErrorType = "balance" | "asset"

export interface ISTCStateSave<AT extends IBaseTradeAsset> {
    id: string
    metrics: ISTCMetricsSave<AT>
    wallet: IDEXWallet
}

export abstract class SlaveTraderCtrl<
            TradeAPI extends BaseTradeApi<TradeAsset> = BaseTradeApi<any>,
            TradeAsset extends IBaseTradeAsset = IBaseTradeAsset>
        extends EventEmitter
        implements Identificable<string> {

    protected _metrics: STCMetrics<TradeAsset>

    protected traider: ITraider

    on_cmd_failed: (cmd: OfferCmd<TradeAsset>) => void = () => {}

    constructor(
        public readonly id: string,
        protected tradeApi: TradeAPI,
        metricsHistory: ISTCMetricsSave<TradeAsset>|null = null,
        wallet: IDEXWallet,
        protected sequalizer: Sequalizer|null = null
    ) {
        super()
        this._metrics = new STCMetrics(metricsHistory)
        this.traider = {
            wallet: Object.assign({}, wallet)
        }
    }

    abstract clone(newId: string, metricsHistory: ISTCMetricsSave<TradeAsset>|null, newTraider: ITraider, newSequalizer?: Sequalizer): SlaveTraderCtrl<TradeAPI, TradeAsset>

    toSave(): ISTCStateSave<TradeAsset> {
        return {
            id: this.id,
            wallet: this.traider.wallet,
            metrics: this._metrics.toSave(),
        }
    }

    public setSequalizer(sequalizer: Sequalizer) {
        this.sequalizer = sequalizer
    }

    public get Wallet(): IDEXWallet {
        return new Cloner(this.traider.wallet).clone()
    }

    public async canPerformOffer(offer: IOffer<TradeAsset>, side: TradeSideType, walletmngr: BaseWalletManager): Promise<{
        success: boolean
        spent: bigint
        error?: {
            msg: string,
            err: CheckPerformErrorType
        },
        rest: bigint
    }> {
        const balance = await walletmngr.balance(this.traider.wallet)
        let avalibleBalance = walletmngr.nativeCurrencyBalance(balance)!.amount

        if (side === TradeSideConst.Sell) {
            let asset = balance.find(b => b.mint === offer.asset.mint)
            if (!asset) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `No asset: ${offer.asset.mint}`,
                        err: "asset"
                    },
                    rest: 0n
                }
            }

            const assetPrice = (await this.tradeApi.assetInfo(offer.asset))?.price ?? 600n
            if (asset.amount < offer.maxSpent / assetPrice) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `Not enough asset: ${offer.asset.mint}`,
                        err: "balance"
                    },
                    rest: 0n
                }
            }
        } else if (side === TradeSideConst.Buy) {
            if (avalibleBalance < offer.maxSpent) {
                return {
                    success: false,
                    spent: 0n,
                    error: {
                        msg: `Not enough balance`,
                        err: "balance"
                    },
                    rest: 0n
                }
            }
        } else {
            throw new Error(`SlaveTraderCtrl::canPerformOffer() Unknown side: ${side}`)
        }

        return {
            success: true,
            spent: offer.maxSpent,
            rest: avalibleBalance - offer.maxSpent,
        }
    }

    public metrics(): (ISTCMetrics<TradeAsset>&({lastTrade: ITradeCommit<TradeAsset>&WithExecTime|null})) {
        return this._metrics.agregate()
    }

    pushSell(
        offer: Omit<IOffer<TradeAsset>, "traider">,
        opt: Omit<Partial<ICmdPushOfferOpts<TradeAsset>>, "offer"> = {},
        afterId?: string
    ) {
        return this.pushOffer({
            offer: {
                ...offer,
                traider: this.traider
            },
            setup: opt.setup ?? {},
            decline: opt.decline ?? {},
            exe: opt.exe ?? {}
        }, TradeSideConst.Sell, afterId)
    }

    pushBuy(
        offer: Omit<IOffer<TradeAsset>, "traider">,
        opt: Omit<Partial<ICmdPushOfferOpts<TradeAsset>>, "offer"> = {},
        afterId?: string
    ) {
        return this.pushOffer({
            offer: {
                ...offer,
                traider: this.traider
            },
            setup: opt.setup ?? {},
            decline: opt.decline ?? {},
            exe: opt.exe ?? {}
        }, TradeSideConst.Buy, afterId)
    }

    private pushOffer(
        opt: ICmdPushOfferOpts<TradeAsset>,
        side: TradeSideType,
        afterId?: string
    ) {
        if (!this.sequalizer) {
            throw new Error(`SlaveTraderCtrl::pushOffer() Sequalizer not set`)
        }

        const delay = opt.setup.delay
        const wait_id = `${this.id}-${MasterTraderCtrl.slaveOrdinaryNumber.toString()}-${side}-${opt.offer.asset.mint}-${this.sequalizer.genId()}`

        const cmd = new OfferCmd<TradeAsset>({
            id: wait_id,
            cmd_opt: opt,
            side,
            api: this.tradeApi,
        })

        cmd.on("Done", (id: string, exec_time: number, success: boolean, commit?: ITradeCommit<TradeAsset>, balanceRest?: bigint) => this._handleCmdDone.bind(this)(id, exec_time, success, commit, balanceRest))
        cmd.on('DropOne', this._handleCmdDrop.bind(this))
        cmd.on('DropAll', this._handleCmdDropAll.bind(this))

        this.sequalizer!.enqueue({
            id: wait_id,
            delay: delay ? new HMSTime({milliseconds: delay}) : undefined,
            command: cmd,
            after: afterId
        })
        return wait_id
    }

    async shutdown() {
        if (BaseWalletManager.cmpWallets(this.traider.wallet, BLANK_WALLET_OBJ)) {
            return
        }

        if (this.sequalizer && this.sequalizer.isRunning()) {
            log.info(`SlaveTraderCtrl::shutdown() removing queue for ${this.id}`)
            const { removed, kept } = this.sequalizer!.filterQueue(
                t => t.id.includes(this.id))
            log.info(`SlaveTraderCtrl::shutdown() removed ${removed.length} tasks for ${this.id}`)
            log.info(`SlaveTraderCtrl::shutdown() kept ${kept.length} tasks for ${this.id}`)

            const success = await this.sequalizer.waitTasksWithIdMatch(this.id)

            log.info(`SlaveTraderCtrl::shutdown() awaited all tasks for ${this.id}. Await success: ${success}`)
        }
        log.info(`SlaveTraderCtrl::shutdown() saving metrics with trades count: ${this._metrics.Trades.length} for ${this.id}`)
        //this.saveMetrics()
    }

    ////////////////////////

    private _handleCmdDone(awaited_id: string, exec_time: number, success: boolean, commit?: ITradeCommit<TradeAsset>, balanceRest?: bigint) {
        console.log(`"${awaited_id}" done. success: ${success}`)
        if (!success || !commit) {
            //console.error()
            // TODO
        } else if (commit && success) {
            this._metrics.addTrade({ ...commit, exec_time })
            if (commit.side === TradeSideConst.Sell) {
                this.emit("sell", awaited_id, commit, balanceRest)
                //this.onsell(commit)
            } else {
                this.emit("onbuy", awaited_id, commit, balanceRest)
                //this.onbuy(commit)
            }
        }
    }

    private _handleCmdDrop(id: string) {
        console.log(`"${id}" dropped.`)
        this._metrics.increaseDroped()
    }

    private _handleCmdDropAll(id: string) {
        console.log(`after "${id}" all dropped.`)
        const {droped, unDropable} = this.sequalizer!.dropTasks()
        console.log(`"${unDropable}" already in execution pipeline. ${droped} dropped.`)
        this._metrics.increaseDroped(droped)
    }
}

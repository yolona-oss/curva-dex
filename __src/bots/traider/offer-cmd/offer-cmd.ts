import { ICommand } from "@core/types/command"
import { EventEmitter } from "events"

import { BaseTradeApi } from "./../base-trade-api"
import { TradeSideConst, TradeSideType, IOffer } from "./../types/trade"
import { IBaseTradeAsset } from "./../types/asset"
import { MAX_SLIPPAGE_DECIMAL } from "../constants"

import { retrier } from "@utils/async-tools"

export interface ICmdPushOffer_ExeOpts {
    retries?: number,
    timeout?: number,
    delay?: number,
}

export interface ICmdPushOffer_DeclineOpts<TradeAsset extends IBaseTradeAsset = any> {
    declineCond?: (trade: IOffer<TradeAsset>) => Promise<boolean>
    declineCascade?: boolean
}

export interface ICmdPushOffer_SetupOpt {
    delay?: number
}

export interface ICmdPushOfferOpts<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    offer: IOffer<TradeAsset>,
    setup: ICmdPushOffer_SetupOpt,
    decline: ICmdPushOffer_DeclineOpts,
    exe: ICmdPushOffer_ExeOpts
}

export class OfferCmd<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> extends EventEmitter implements ICommand<void> {
    private id: string
    private api: BaseTradeApi<TradeAsset>
    private cmd_opt: ICmdPushOfferOpts<TradeAsset>
    private side: TradeSideType

    constructor(config: {
        id: string,
        api: BaseTradeApi<TradeAsset>,
        cmd_opt: ICmdPushOfferOpts<TradeAsset>,
        side: TradeSideType
    }) {
        super()
        this.id = config.id
        this.api = config.api.clone()
        this.cmd_opt = Object.assign({}, config.cmd_opt)
        this.side = config.side
    }

    async execute() {
        const offer = this.cmd_opt.offer
        const { exe } = this.cmd_opt
        const { retries, timeout } = exe
        const { declineCond, declineCascade } = this.cmd_opt.decline
        const id = this.id

        const offerFn = this.side === TradeSideConst.Buy ? this.api.buy : this.api.sell

        if (declineCond) {
            if (await declineCond(this.cmd_opt.offer)) {
                if (declineCascade) {
                    this.emit("DropAll", id)
                    return
                }
                this.emit("DropOne", id)
                return
            }
        }

        const start = performance.now()
        let exeRes = await retrier(
            async () => await offerFn({
                ...offer,
            }),
            {
                retries: retries || 1,
                timeout: timeout
            }
        )
        const delta = performance.now() - start

        this.emit("Done", id, delta, exeRes.success, exeRes.commit, exeRes.balanceRest)
    }
}

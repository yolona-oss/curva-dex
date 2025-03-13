import { MasterTraderCtrl } from "../mtc";
import { SlaveTraderCtrl } from "../stc";
import { BaseTradeApi } from "../base-trade-api";

import { BaseWalletManager } from "../wallet-manager";
import { IBaseTradeAsset } from "../types";

export interface ITradeArchImpl<
    ApiType extends BaseTradeApi<TradeAsset>,
    TradeAsset extends IBaseTradeAsset,
    WMType extends BaseWalletManager = BaseWalletManager> {
    readonly name: string
    readonly api: ApiType,
    readonly mtc: MasterTraderCtrl<ApiType, TradeAsset, WMType>
    readonly stc: SlaveTraderCtrl<ApiType, TradeAsset>
    readonly walletManager: BaseWalletManager
}

export class TradeArchImplRegistry {
    private impls: Array<ITradeArchImpl<any, any>> = new Array()
    public static __instance: TradeArchImplRegistry

    private constructor() { }

    public static get Instance() {
        return this.__instance || (this.__instance = new this())
    }

    register<ApiType extends BaseTradeApi<TradeAsset>, TradeAsset extends IBaseTradeAsset, WMType extends BaseWalletManager>({ name, api, mtc, stc, walletManager }: ITradeArchImpl<ApiType, TradeAsset, WMType>) {
        if (this.has(name)) {
            throw new Error(`bot impl ${name} already exists`)
        }
        this.impls.push({ name, api, mtc, stc, walletManager })
    }

    get<ApiType extends BaseTradeApi<TradeAsset>, TradeAsset extends IBaseTradeAsset, WMType extends BaseWalletManager>(name: string): ITradeArchImpl<ApiType, TradeAsset, WMType> | undefined {
        return this.impls.find(i => i.name === name) as ITradeArchImpl<ApiType, TradeAsset, WMType>
    }

    has(name: string) {
        return !!this.get(name)
    }

    avaliable() {
        return this.impls.map(i => i.name)
    }
}

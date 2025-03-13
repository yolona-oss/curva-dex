import { EventEmitter } from "events";
import { Identificable } from "@core/types/identificable";

import { IAssetInfo, IBaseTradeAsset } from "./types/asset";
import { IOffer, ITradeCommit } from './types/trade';

export type IApiTradeResponce<AssetType extends IBaseTradeAsset> = {
    commit?: ITradeCommit<AssetType>,
    balanceRest?: bigint,
    success: boolean
}

export type TradeApiListnerType<EventName extends string, TxData> = (event: EventName, tx: TxData) => Promise<void>

type TradeApiListnerVariant = TradeApiListnerType<any, any>|number

export abstract class BaseTradeApi<AssetType extends IBaseTradeAsset> extends EventEmitter implements Identificable {
    /* NOTE: its ambiguous :_( */
    protected assetsSubs: Map<string, TradeApiListnerVariant[]> = new Map() // mint -> (listners |or| ev subscription id)

    constructor(
        public readonly id: string
    ) {
        super()
    }

    abstract clone(): any

    abstract assetInfo(asset: AssetType): Promise<IAssetInfo|null>;

    abstract subscribeToAssetTrades<EventName extends string, TxData>(mint: string, listner: TradeApiListnerType<EventName, TxData>): Promise<number|void>;
    abstract unsubscribeFromAssetTrades(mint: string, target: TradeApiListnerVariant): void;
    abstract unsubscribeFromAssetFromAllListners(mint: string): void;

    // no throws... plz :>
    abstract buy(opt: IOffer<AssetType>): Promise<IApiTradeResponce<AssetType>>
    abstract sell(opt: IOffer<AssetType>): Promise<IApiTradeResponce<AssetType>>;

    abstract createAsset(asset: AssetType, supply: number): Promise<void>
}

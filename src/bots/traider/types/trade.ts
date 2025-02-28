import { IBaseTradeAsset } from "./asset";
import { ITraider } from "./traider";

export const TradeSideConst: Record<string, TradeSideType> = {
    Buy: "BUY",
    Sell: "SELL"
}
export type TradeSideType = "BUY" | "SELL"

export type ITradeSupply<T extends number|bigint = bigint> = { quantity: T, price: T }

/**
 * @prop {bigint} in - primary currency if sell or assets amount if buy
 * @prop {bigint} out - assets amount if sell or primary currency if buy
 * @prop {number} assetPrice - asset price in primary currency on the moment of trade
 */
export interface ITradeCommit<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    asset: TradeAsset;
    assetPrice: bigint;
    in: bigint;
    out: bigint;
    side: TradeSideType;
    fee: {
        priority: bigint,
        base: bigint
    }
    signature: string;
    success: boolean;
    time: number;
}

export interface IOffer<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    traider: ITraider,
    asset: TradeAsset,
    maxSpent: bigint, // buy for this amount * (slippagePerc + 1)
    slippagePerc?: number,
    fee?: any,
}

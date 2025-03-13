export interface IBaseTradeAsset {
    symbol: string
    mint: string
}

export interface IBaseDEXTradeAsset extends IBaseTradeAsset {
}

export interface IAssetInfo {
    marketCap: bigint; // in prim currency
    tradesVolume: number; // in prim currency
    price: bigint; // in prim currency
    supply: bigint;
    holders: number;
    complete: boolean;
}

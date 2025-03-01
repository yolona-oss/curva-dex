import { WithExecTime } from "@core/types/with-exec-time"

import { ITradeCommit, TradeSideConst } from "./types/trade"
import { IBaseTradeAsset } from "./types/asset"

type CommitWithExecTime<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> = ITradeCommit<TradeAsset>&WithExecTime

export interface ISTCMetrics<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    Trades: Array<CommitWithExecTime<TradeAsset>>,
    SuccessTrades: Array<CommitWithExecTime<TradeAsset>>,
    SellTrades: Array<CommitWithExecTime<TradeAsset>>,
    BuyTrades: Array<CommitWithExecTime<TradeAsset>>,
    ErrorTrades: Array<CommitWithExecTime<TradeAsset>>,
    ErrorRate: number,
    BuyMeanPrice: bigint,
    SellMeanPrice: bigint,
    AssetTradeVolume: bigint,
    PrimCurrencyTradeVolume: bigint,
    SpentOnAsset: bigint, // in prim currency
    GainOnAsset: bigint, // in prim currency
    SpentOnFee: bigint,
    DropedTradesCount: number,
}

export interface ISTCMetricsSave<AssetType extends IBaseTradeAsset> {
    trades: Array<CommitWithExecTime<AssetType>>,
    droped: number
}

// TODO: remove trades array and save data exacly in the metrics
export class STCMetrics<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    protected trades: Array<ITradeCommit<TradeAsset>&WithExecTime>
    protected droped

    constructor(history: ISTCMetricsSave<TradeAsset>|null = null) {
        this.trades = history?.trades || []
        this.droped = history?.droped || 0
    }

    public toSave(): ISTCMetricsSave<TradeAsset> {
        return {
            trades: this.trades,
            droped: this.droped
        }
    }

    public reset() {
        this.trades = []
    }

    public addTrade(trade: ITradeCommit<TradeAsset>&WithExecTime) {
        this.trades.push(trade)
    }

    public Trades() {
        return this.trades
    }

    public SuccessTrades() {
        return this.trades.filter(t => t.success)
    }

    public SellTrades(successonly = true) {
        return this.trades.filter(t => t.side === "SELL" && (!successonly || t.success))
    }

    public BuyTrades(successonly = true) {
        return this.trades.filter(t => t.side === "BUY" && (!successonly || t.success))
    }

    public ErrorTrades() {
        return this.trades.filter(t => !t.success)
    }

    public ErrorRate() {
        return this.ErrorTrades().length / this.trades.length
    }

    public BuyMeanPrice() {
        const buys = this.BuyTrades(true)
        return buys.reduce((acc, trade) => acc + trade.assetPrice, 0n) / BigInt(buys.length)
    }

    public SellMeanPrice() {
        const sells = this.SellTrades(true)
        return sells.reduce((acc, trade) => acc + trade.assetPrice, 0n) / BigInt(sells.length)
    }

    public AssetTradeVolume(): bigint {
        return this.trades.reduce((acc, trade) => acc + trade.side === TradeSideConst.Buy ? trade.in : trade.out, 0n)
    }

    public PrimCurrencyTradeVolume(): bigint {
        return this.trades.reduce((acc, trade) => acc + trade.side === TradeSideConst.Buy ? trade.out : trade.in, 0n)
    }

    public SpentOnFee() {
        return this.trades.reduce((acc, trade) => acc + trade.fee.priority + trade.fee.base, 0n)
    }

    public SpentOnAsset() {
        return this.BuyTrades(true).reduce((acc, trade) => acc + trade.out, 0n)
    }

    public GainOnAsset() {
        return this.SellTrades(true).reduce((acc, trade) => acc + trade.in, 0n)
    }

    public increaseDroped(i: number = 1) {
        this.droped += i
    }

    public lastTrade() {
        return this.trades[this.trades.length - 1]
    }

    public agregate(): ISTCMetrics<TradeAsset>&({lastTrade: ITradeCommit<TradeAsset>&WithExecTime|null}) {
        return {
            Trades: this.trades,
            lastTrade: this.lastTrade(),
            SuccessTrades: this.SuccessTrades(),
            SellTrades: this.SellTrades(),
            BuyTrades: this.BuyTrades(),
            ErrorTrades: this.ErrorTrades(),
            ErrorRate: this.ErrorRate(),
            BuyMeanPrice: this.BuyMeanPrice(),
            SellMeanPrice: this.SellMeanPrice(),
            AssetTradeVolume: this.AssetTradeVolume(),
            PrimCurrencyTradeVolume: this.PrimCurrencyTradeVolume(),
            SpentOnAsset: this.SpentOnAsset(),
            GainOnAsset: this.GainOnAsset(),
            SpentOnFee: this.SpentOnFee(),
            DropedTradesCount: this.droped,
        }
    }
}

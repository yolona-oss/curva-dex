"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STCMetrics = void 0;
const trade_1 = require("./types/trade");
class STCMetrics {
    trades = [];
    droped = 0;
    reset() {
        this.trades = [];
    }
    addTrade(trade) {
        this.trades.push(trade);
    }
    Trades() {
        return this.trades;
    }
    SuccessTrades() {
        return this.trades.filter(t => t.success);
    }
    SellTrades(successonly = true) {
        return this.trades.filter(t => t.side === "SELL" && (!successonly || t.success));
    }
    BuyTrades(successonly = true) {
        return this.trades.filter(t => t.side === "BUY" && (!successonly || t.success));
    }
    ErrorTrades() {
        return this.trades.filter(t => !t.success);
    }
    ErrorRate() {
        return this.ErrorTrades().length / this.trades.length;
    }
    BuyMeanPrice() {
        const buys = this.BuyTrades(true);
        return buys.reduce((acc, trade) => acc + trade.assetPrice, 0n) / BigInt(buys.length);
    }
    SellMeanPrice() {
        const sells = this.SellTrades(true);
        return sells.reduce((acc, trade) => acc + trade.assetPrice, 0n) / BigInt(sells.length);
    }
    AssetTradeVolume() {
        return this.trades.reduce((acc, trade) => acc + trade.side === trade_1.TradeSideConst.Buy ? trade.in : trade.out, 0n);
    }
    PrimCurrencyTradeVolume() {
        return this.trades.reduce((acc, trade) => acc + trade.side === trade_1.TradeSideConst.Buy ? trade.out : trade.in, 0n);
    }
    SpentOnFee() {
        return this.trades.reduce((acc, trade) => acc + trade.fee.priority + trade.fee.base, 0n);
    }
    SpentOnAsset() {
        return this.BuyTrades(true).reduce((acc, trade) => acc + trade.out, 0n);
    }
    GainOnAsset() {
        return this.SellTrades(true).reduce((acc, trade) => acc + trade.in, 0n);
    }
    increaseDroped(i = 1) {
        this.droped += i;
    }
    agregate() {
        return {
            Trades: this.trades,
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
        };
    }
}
exports.STCMetrics = STCMetrics;

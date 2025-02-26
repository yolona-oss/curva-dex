"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExCurve = exports.CurveTrend = void 0;
const linked_list_1 = require("@utils/struct/linked-list");
const time_range_1 = require("./types/time-range");
const bigint_1 = require("@utils/math/bigint");
var CurveTrend;
(function (CurveTrend) {
    CurveTrend[CurveTrend["UP"] = 0] = "UP";
    CurveTrend[CurveTrend["DOWN"] = 1] = "DOWN";
    CurveTrend[CurveTrend["FLAT"] = 2] = "FLAT";
})(CurveTrend || (exports.CurveTrend = CurveTrend = {}));
function findRiseAndFallCuts(arr, toler = 0) {
    const cuts = [];
    let start_rise = null;
    let start_fall = null;
    for (let i = 1; i < arr.length; i++) {
        const diff = arr[i] - arr[i - 1];
        if (diff >= 0 && start_rise === null) {
            start_rise = i - 1;
        }
        if (diff <= -toler && start_rise !== null) {
            cuts.push({ start: start_rise, end: i - 1 });
            start_rise = null;
        }
        if (diff <= 0 && start_fall === null) {
            start_fall = i - 1;
        }
        if (diff >= toler && start_fall !== null) {
            cuts.push({ start: start_fall, end: i - 1 });
            start_fall = null;
        }
    }
    if (start_rise !== null) {
        cuts.push({ start: start_rise, end: arr.length - 1 });
    }
    return cuts;
}
class ExCurve {
    trades;
    static tradesInCut(trades, start, range) {
        return trades.filter(v => (0, time_range_1.isExDateInRange)(start, v.time, range));
    }
    static sortTrades(trades) {
        return trades.sort((a, b) => a.time - b.time);
    }
    static tradesInTimeCut(trades, start, end) {
        return trades.filter(v => v.time >= start && v.time <= end);
    }
    constructor(initial) {
        this.trades = initial ? ExCurve.sortTrades(initial) : [];
    }
    getTrendsByLastTx(lastTx = 0) {
        if (lastTx < 0) {
            throw new Error("lastTx must be >= 0");
        }
        const cut = this.trades.slice(this.trades.length - (lastTx === 0 ? 0 : this.trades.length - lastTx));
        const cuts = findRiseAndFallCuts(cut.map(v => v.price));
        return cuts.map(v => ({
            trend: cut[v.end].price > cut[v.start].price ? CurveTrend.UP : CurveTrend.DOWN,
            tx_ind_start: v.start,
            tx_ind_end: v.end,
            tx_time_range: {
                start: cut[v.start].time,
                end: cut[v.end].time,
            },
        }));
    }
    getTrendsByTimeCut(timeCut) {
        if (timeCut.limit < 0 || timeCut.offset < 0) {
            throw new Error("timeCut.offset and timeCut.limit must be >= 0");
        }
        if (timeCut.limit < timeCut.offset) {
            throw new Error("timeCut.limit must be >= timeCut.offset");
        }
        const cut = ExCurve.tradesInTimeCut(this.trades, timeCut.offset, timeCut.limit);
        const cuts = findRiseAndFallCuts(cut.map(v => v.price));
        return cuts.map(v => ({
            trend: cut[v.end].price > cut[v.start].price ? CurveTrend.UP : CurveTrend.DOWN,
            tx_ind_start: v.start,
            tx_ind_end: v.end,
            tx_time_range: {
                start: cut[v.start].time,
                end: cut[v.end].time,
            },
        }));
    }
    getTrends(byOpt) {
        if (!byOpt) {
            return this.getTrendsByLastTx();
        }
        const lastTx = byOpt.lastTx;
        const timeCut = byOpt.timeCut;
        if (lastTx && timeCut) {
            throw new Error("Cannot specify both lastTx and timeCut");
        }
        if (lastTx) {
            return this.getTrendsByLastTx(lastTx);
        }
        else if (timeCut) {
            return this.getTrendsByTimeCut(timeCut);
        }
        throw new Error("No execution pattern found");
    }
    addTrade(trade) {
        this.trades.push(trade);
    }
    getTrades() {
        return Object.assign({}, this.trades);
    }
    mapToSimpleCurve(range, cut) {
        this.trades = ExCurve.sortTrades(this.trades);
        const list = new linked_list_1.LinkedList();
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
                this.trades;
        const trades_chunks = [];
        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range);
            trades_chunks.push(chunk);
            i += chunk.length;
        }
        for (const chunk of trades_chunks) {
            list.insertAtEnd({
                open: chunk[0].price,
                close: chunk[chunk.length - 1].price,
                high: bigint_1.BigIntMath.max(...chunk.map(v => v.price)),
                low: bigint_1.BigIntMath.min(...chunk.map(v => v.price)),
                timeStart: chunk[0].time,
            });
        }
        return list;
    }
    mapToFullCurve(range, cut) {
        this.trades = ExCurve.sortTrades(this.trades);
        const list = new linked_list_1.LinkedList();
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
                this.trades;
        const trades_chunks = [];
        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range);
            trades_chunks.push(chunk);
            i += chunk.length;
        }
        for (const trade of trades) {
            list.insertAtEnd({
                trades: [trade],
                timeStart: trade.time,
            });
        }
        return list;
    }
    consolePrintVertical(barSymbol = "=") {
        const maxPrice = Number(this.trades.length > 0 ? bigint_1.BigIntMath.max(...this.trades.map(v => v.price)) : 0);
        const consoleWidth = Math.floor(process.stdout.columns - process.stdout.columns * 0.3);
        for (let i = 0; i < this.trades.length; i++) {
            const perc = Number(this.trades[i].price) / maxPrice;
            const bar = barSymbol.repeat(Math.round(perc * consoleWidth));
            console.log(`i: ${i}\t${this.trades[i].price} ${bar}`);
        }
    }
    consolePrintHorizontal(column = 50, barSymbol = "=") {
        let from = this.trades.length - column;
        if (from < 0) {
            from = 0;
        }
        const cut = this.trades.slice(from);
        const maxHeight = bigint_1.BigIntMath.max(...cut.map(v => v.price));
        for (let i = maxHeight; i > 0; i--) {
            let line = '';
            for (const num of cut.map(v => v.price)) {
                if (num >= i) {
                    line += barSymbol;
                }
                else {
                    line += ' ';
                }
            }
            console.log(line);
        }
        console.log(cut.map(v => v.price));
    }
}
exports.ExCurve = ExCurve;

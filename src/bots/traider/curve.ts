import { LinkedList } from "@utils/struct/linked-list";
import { TimeRange } from "@utils/time";

import { ExCurveNodeList, ExCurveTrade } from "./types/ex-curve";
import { ExTimeRangeType, isExDateInRange } from "./types/time-range";

import { BigIntMath } from '@utils/math/bigint'

export type ExCurveTradePoint = ExCurveTrade&{time:number}
export type ExCurveTradePoints = ExCurveTradePoint[]

export enum CurveTrend {
    UP,
    DOWN,
    FLAT,
}

export interface CurveTrendPoint {
    trend: CurveTrend;
    tx_ind_start: number
    tx_ind_end: number
    tx_time_range: {
        start: number
        end: number
    }
}

type TRange = {
    start: number;
    end: number;
};

function findRiseAndFallCuts<T extends number|bigint>(arr: Array<T>, toler = 0) {
    const cuts: Array<TRange> = [];
    let start_rise = null;
    let start_fall = null;

    for (let i = 1; i < arr.length; i++) {
        const diff = arr[i] - arr[i - 1];

        // rises
        if (diff >= 0 && start_rise === null) {
            start_rise = i - 1;
        }
        if (diff <= -toler && start_rise !== null) {
            cuts.push({ start: start_rise, end: i - 1 });
            start_rise = null;
        }

        // falls
        if (diff <= 0 && start_fall === null) {
            start_fall = i - 1;
        }
        if (diff >= toler && start_fall !== null) {
            cuts.push({ start: start_fall, end: i - 1 });
            start_fall = null;
        }
    }

    // Handle the case where the last cut ends at the last element
    if (start_rise !== null) {
        cuts.push({ start: start_rise, end: arr.length - 1 });
    }

    return cuts;
}

export class ExCurve {
    protected trades: ExCurveTradePoints

    static tradesInCut(trades: ExCurveTradePoints, start: number, range: ExTimeRangeType) {
        return trades.filter(v => isExDateInRange(start, v.time, range))
    }

    static sortTrades(trades: ExCurveTradePoints) {
        return trades.sort((a, b) => a.time - b.time)
    }

    static tradesInTimeCut(trades: ExCurveTradePoints, start: number, end: number) {
        return trades.filter(v => v.time >= start && v.time <= end)
    }

    constructor(initial?: ExCurveTradePoints) {
        this.trades = initial ? ExCurve.sortTrades(initial) : []
    }

    public getTrendsByLastTx(lastTx: number = 0): CurveTrendPoint[] {
        if (lastTx < 0) {
            throw new Error("lastTx must be >= 0")
        }
        const cut = this.trades.slice(this.trades.length - (lastTx === 0 ? 0 : this.trades.length - lastTx))
        const cuts = findRiseAndFallCuts(cut.map(v => v.price))

        return cuts.map(v => ({
            trend: cut[v.end].price > cut[v.start].price ? CurveTrend.UP : CurveTrend.DOWN,
            tx_ind_start: v.start,
            tx_ind_end: v.end,
            tx_time_range: {
                start: cut[v.start].time,
                end: cut[v.end].time,
            },
        }))
    }

    public getTrendsByTimeCut(timeCut: TimeRange): CurveTrendPoint[] {
        if (timeCut.limit < 0 || timeCut.offset < 0) {
            throw new Error("timeCut.offset and timeCut.limit must be >= 0")
        }
        if (timeCut.limit < timeCut.offset) {
            throw new Error("timeCut.limit must be >= timeCut.offset")
        }

        const cut = ExCurve.tradesInTimeCut(this.trades, timeCut.offset, timeCut.limit)
        const cuts = findRiseAndFallCuts(cut.map(v => v.price))

        return cuts.map(v => ({
            trend: cut[v.end].price > cut[v.start].price ? CurveTrend.UP : CurveTrend.DOWN,
            tx_ind_start: v.start,
            tx_ind_end: v.end,
            tx_time_range: {
                start: cut[v.start].time,
                end: cut[v.end].time,
            },
        }))
    }

    /**
     * @param byOpt{lastTx:number|undefined, timeCut:TimeRange|undefined} lastTx and timeCut are mutually exclusive and by default used lastTx as zero value to get treads on all curve
     */
    public getTrends(byOpt?: {lastTx?: number, timeCut?: TimeRange}): CurveTrendPoint[] {
        if (!byOpt) {
            return this.getTrendsByLastTx()
        }

        const lastTx = byOpt.lastTx
        const timeCut = byOpt.timeCut
        if (lastTx && timeCut) {
            throw new Error("Cannot specify both lastTx and timeCut")
        }

        if (lastTx) {
            return this.getTrendsByLastTx(lastTx)
        } else if (timeCut) {
            return this.getTrendsByTimeCut(timeCut)
        }

        throw new Error("No execution pattern found")
    }

    public addTrade(trade: ExCurveTradePoint) {
        this.trades.push(trade)
    }

    /***
    * @description returns copy of trades store
    */
    public getTrades() {
        return Object.assign({}, this.trades)
    }

    public mapToSimpleCurve(range: ExTimeRangeType, cut?: TimeRange): ExCurveNodeList<"simple"> {
        this.trades = ExCurve.sortTrades(this.trades)
        const list: ExCurveNodeList<"simple"> = new LinkedList()
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
            this.trades

        const trades_chunks = []

        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range)
            trades_chunks.push(chunk)
            i += chunk.length
        }

        for (const chunk of trades_chunks) {
            list.insertAtEnd({
                open: chunk[0].price,
                close: chunk[chunk.length - 1].price,
                high: BigIntMath.max(...chunk.map(v => v.price)),
                low: BigIntMath.min(...chunk.map(v => v.price)),
                timeStart: chunk[0].time,
            })
        }

        return list
    }

    public mapToFullCurve(range: ExTimeRangeType, cut?: TimeRange): ExCurveNodeList<"full"> {
        this.trades = ExCurve.sortTrades(this.trades)
        const list: ExCurveNodeList<"full"> = new LinkedList()
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
            this.trades

        const trades_chunks = []

        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range)
            trades_chunks.push(chunk)
            i += chunk.length
        }

        for (const trade of trades) {
            list.insertAtEnd({
                trades: [trade],
                timeStart: trade.time,
            })
        }
        return list
    }

    public consolePrintVertical(barSymbol: string = "=") {
        const maxPrice = Math.max(...this.trades.map(v => Number(v.price)))
        const consoleWidth = Math.floor(process.stdout.columns - process.stdout.columns * 0.3)
        for (let i = 0; i < this.trades.length; i++) {
            const perc = Number(this.trades[i].price) / maxPrice
            const bar = barSymbol.slice(0,1).repeat(Math.floor(perc * consoleWidth))
            console.log(`i: ${i}\t${this.trades[i].price} ${bar}`)
        }
    }

    public consolePrintHorizontal(column: number = 50, barSymbol: string = "=") {
        let from = this.trades.length - column
        if (from < 0) {
            from = 0
        }

        const cut = this.trades.slice(from)

        const maxHeight = BigIntMath.max(...cut.map(v => v.price))

        for (let i = maxHeight; i > 0; i--) {
            let line = ''

            for (const num of cut.map(v => v.price)) {
                if (num >= i) {
                    line += barSymbol
                } else {
                    line += ' '
                }
            }

            console.log(line)
        }
        console.log(cut.map(v => v.price))
    }
}

import { ExTimeRangeType } from "./time-range";
import { LinkedList } from "@utils/struct/linked-list";
import { TradeSideConst } from "./trade";

export interface ExCurveSimpleNode {
    open: bigint,
    close: bigint,
    high: bigint,
    low: bigint,
    timeStart: number
}

export interface ExCurveFullNode {
    trades: ExCurveTrade[],
    timeStart: number,
}

export interface ExCurveTrade {
    sign: string
    price: bigint,
    quantity: bigint,
    side: typeof TradeSideConst[keyof typeof TradeSideConst];
}

export interface ExCurveTradeSave {
    sign: string
    price: string,
    quantity: string,
    side: typeof TradeSideConst[keyof typeof TradeSideConst];
}

export type ExCurveNodeList<T extends "simple" | "full"> = LinkedList<T extends "simple" ? ExCurveSimpleNode : ExCurveFullNode>

export type isExCurveSimpleNode = (obj: any) => obj is ExCurveSimpleNode
export type isExCurveFullNode = (obj: any) => obj is ExCurveFullNode

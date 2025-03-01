import { Opt, OptsMap } from "@core/utils/opts-parser"

export interface IDefaultServiceSessionData {
    createTime: number
    expirity: number // end on createTime+expirity
    initialExpirity: number // intial expirity that value will be added to expirity if incrementalExpirity is true
    incrementalExpirity: boolean // if true - every time when service run with new expirity
}

export const defaultServiceParamsMap: IDefaultServiceParams = {
    '--session-id': Opt.String,
    '-s': Opt.String
}

export interface IDefaultServiceParams extends OptsMap {
    '--session-id': String
    '-s': String
}

/**
 * key - msg-name
 * value - args one-word description
 */
export type IReceiveMsgArgs = Record<string, string[]|null>


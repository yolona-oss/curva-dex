export interface IDefaultServiceParametersOpts {
    '--session-id': string
    '-s': string
}

/**
 * key - msg-name
 * value - args one-word description
 */
export type IReceiveMsgArgs = Record<string, string[]|undefined>

export type IReceiveMsgArgsDef = Record<string, string[]|undefined>

export interface IServiceSessionData {
    createTime: number
    expirity: number // end on createTime+expirity
    initialExpirity: number // intial expirity that value will be added to expirity if incrementalExpirity is true
    incrementalExpirity: boolean // if true - every time when service run with new expirity
}

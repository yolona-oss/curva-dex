import { CmdArgumentOptionsType } from "@core/ui/types/command"
import { IExtendedOptsMapEntry, IExtendedOptsMapEntryParsed, OptsMap } from "@core/utils/opts-parser"
import { genRandomString } from "@core/utils/random"

export interface IDefaultServiceSessionData {
    createTime: number
    expirity: number // end on createTime+expirity
    initialExpirity: number // intial expirity that value will be added to expirity if incrementalExpirity is true
    incrementalExpirity: boolean // if true - every time when service run with new expirity
}

export const defaultServiceParamsMapDef: IExtendedOptsMapEntry<CmdArgumentOptionsType>[] = [
    {
        name: '--session-id',
        argType: 'string',
        argValidator: (arg: string) => Boolean(arg.match(/^[0-9a-zA-Z]{4}$/)),
        argOptions: new Array<string>(4).fill('').map(() => genRandomString(4))
    },
    {
        name: '-s',
        argType: 'string',
        argValidator: (arg: string) => Boolean(arg.match(/^[0-9a-zA-Z]{4}$/)),
        argOptions: new Array<string>(4).fill('').map(() => genRandomString(4))
    }
]

export interface IDefaultServiceParamsDefEntry extends IExtendedOptsMapEntry<CmdArgumentOptionsType> { }

export interface IDefaultServiceParams extends OptsMap {
    '--session-id': String
    '-s': String
}

/**
 * key - msg-name
 * value - args one-word description
 */
export type IReceiveMsgArgs = Record<string, string[]|null>

export type IReceiveMsgArgsDef = Record<string, IExtendedOptsMapEntry<CmdArgumentOptionsType>[]>

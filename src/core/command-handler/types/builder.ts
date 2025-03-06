import { BaseCommandArgumentDesc } from "@core/ui/types/command"

export interface ICmdBuilderMarkupOption {
    text: string,
    callback_data: string
}

/**
 * @param text - text to describe current action
 * @param options - list of options to choose from
 */
export interface ICmdBuilderMarkup {
    text: string
    options?: ICmdBuilderMarkupOption[]
}

export interface IBuilderCmdArgDesc extends BaseCommandArgumentDesc {
    ctx: ReadingCtxType,
    name: string,
    pairOptions?: string[]
}

export interface IBuilderCmdDesc {
    args: IBuilderCmdArgDesc[]
}

type ReadingValueType = "name" | "value" | "ctx"
export type ReadingCtxType = "args" | "config" | "params" | "message"

export interface IBuilderCmdArgReadResult {
    ctx: ReadingCtxType
    name: string
    value: string
}

export interface ICmdBuildingState {
    command: string
    avalibleCtxs: ReadingCtxType[]
    descriptor: IBuilderCmdDesc
    state: {
        readingCtx: ReadingCtxType
        readingValue: ReadingValueType
        read: IBuilderCmdArgReadResult[]
    }

    //defaultOptions?: IBuilderMarkupOption[]
    //defaultOptionHandler?: (input: string) => IHandleResult
}

export interface ICmdBuildResult {
    command: string
    args: IBuilderCmdArgReadResult[]
}

export interface ICmdBuilderHandleResult {
    done: boolean
    built?: ICmdBuildResult
    error?: string
    markup: ICmdBuilderMarkup
}

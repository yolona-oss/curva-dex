export interface IBuilderMarkupOption {
    text: string,
    callback_data: string
}

/**
 * @param text - text to describe current action
 * @param options - list of options to choose from
 */
export interface ICommandBuilderMarkup {
    text: string
    options?: IBuilderMarkupOption[]
}

export interface ICommandDescriptorArg {
    ctx: ReadingCtxType,
    name: string,
    type?: string, // defaulted to string
    options?: string[], // undefined means no options, zero arr len means user self input
    validator?: (arg: string) => boolean
}

export interface ICommandDescriptor {
    args: ICommandDescriptorArg[]
}

type ReadingValueType = "name" | "value" | "ctx"
export type ReadingCtxType = "args" | "config" | "params" | "message"

export interface IArgReadResult {
    ctx: ReadingCtxType
    name: string
    value: string
}

export interface ICmdBuildingState {
    command: string
    avalibleCtxs: ReadingCtxType[]
    descriptor: ICommandDescriptor
    state: {
        readingCtx: ReadingCtxType
        readingValue: ReadingValueType
        read: IArgReadResult[]
    }

    //defaultOptions?: IBuilderMarkupOption[]
    //defaultOptionHandler?: (input: string) => IHandleResult
}

export interface ICmdBuildResult {
    command: string
    args: IArgReadResult[]
}

export interface ICmdBuilderHandleResult {
    done: boolean
    built?: ICmdBuildResult
    error?: string
    markup: ICommandBuilderMarkup
}

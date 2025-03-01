import { unique } from "@core/utils/array"

export interface IBuilderMarkupOption {
    text: string,
    callback_data: string
}

/**
 * @param text - text to describe current action
 * @param options - list of options to choose from
 */
export interface IBuilderMarkup {
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

interface IArgReadResult {
    ctx: ReadingCtxType
    name: string
    value: string|null
}

interface IBuildingState {
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

interface IBuildResult {
    command: string
    args: IArgReadResult[]
}

interface IHandleResult {
    done: boolean
    built?: IBuildResult
    error?: string
    markup: IBuilderMarkup
}

const DefaultCallbacks = {
    execute: "__execute",
    cancel: "__cancel",
    switchCtx: "__switchCtx"
}

const defaultOptions: IBuilderMarkupOption[] = [
    {
        text: "Execute",
        callback_data: DefaultCallbacks.execute
    },
    {
        text: "Cancel",
        callback_data: DefaultCallbacks.cancel
    },
    {
        text: "Select reading context",
        callback_data: DefaultCallbacks.cancel
    }
]

function toMarkup(opt: string): IBuilderMarkupOption {
    return {
        text: opt,
        callback_data: opt
    }
}

function toSwitchCtxMarkup(ctxs: ReadingCtxType[]) {
    return {
        text: "Switch reading context.",
        options: ctxs.map(ctx => toMarkup(ctx))
    }
}

// TODO mark readed args with * start line marker to make it easier to read
export class CommandBuilder {
    private usersBuildingQueue: Map<string, IBuildingState> = new Map()

    constructor() {

    }

    isUserOnBuild(userId: string) {
        if (this.usersBuildingQueue.has(userId)) {
            return true
        }
        return false
    }

    private stopBuild(userId: string) {
        this.usersBuildingQueue.delete(userId)
    }

    private build(userId: string): IBuildResult|null {
        const curr = this.usersBuildingQueue.get(userId)
        if (!curr) {
            return null
        }

        return {
            command: curr.command,
            args: curr.state.read
        }
    }

    startBuild(userId: string, command: string, desc: ICommandDescriptor, contexts: ReadingCtxType[] = ['args']): IBuilderMarkup {
        if (this.usersBuildingQueue.has(userId)) {
            throw "User already has active build."
        }

        const uniqCtxs = unique(contexts)
        if (uniqCtxs.length === 0) {
            throw "No avalible contexts."
        }

        if (desc.args.length === 0) {
            throw "No arguments in descriptor. Nothing to build."
        }

        const initialCtx = uniqCtxs[0]

        this.usersBuildingQueue.set(userId, {
            command,
            avalibleCtxs: uniqCtxs,
            descriptor: desc,
            state: {
                readingCtx: initialCtx,
                readingValue: 'name',
                read: []
            }
        })

        const initialCtxOptions = desc.args.filter(arg => arg.ctx === initialCtx)

        return {
            text: `Start building for: "${command}", inital ctx: ${initialCtx}. Select argument name:`,
            options: [
                ...defaultOptions,
                ...initialCtxOptions.map(arg => toMarkup(arg.name))
            ]
        }
    }

    // ridiculous logic implementation of state machine :((
    private handleInner(userId: string, _input: string): IHandleResult {
        const input = _input.toLowerCase().trim()
        const cur = this.usersBuildingQueue.get(userId)
        if (!cur) {
            return {
                done: true,
                error: "No active build for user: " + userId,
                markup: {
                    text: "No active build for user: " + userId,
                }
            }
        }

        if (cur.state.readingValue === 'ctx') {
            if (cur.avalibleCtxs.includes(input as any)) {
                cur.state.readingCtx = input as ReadingCtxType
                cur.state.readingValue = 'name'
                return {
                    done: false,
                    markup: {
                        text: "Ctx switched to: " + input + ". Select argument name:",
                        options: [
                            ...defaultOptions,
                            ...cur.descriptor.args.filter(arg => arg.ctx === input).map(arg => toMarkup(arg.name))
                        ]
                    }
                }
            } else {
                return {
                    done: true,
                    markup: {
                        text: "Unknown ctx: " + input + ". Exiting...",
                    }
                }
            }
        }

        if (input === DefaultCallbacks.cancel) {
            this.stopBuild(userId)
            return {
                done: true,
                markup: {
                    text: "Build canceled",
                }
            }
        }

        if (input === DefaultCallbacks.execute) {
            const res = this.build(userId)
            return {
                done: true,
                built: res ? res : undefined,
                markup: {
                    text: res ? "Build done" : "Build failed",
                }
            }
        }

        if (input === DefaultCallbacks.switchCtx) {
            return {
                done: true,
                markup: toSwitchCtxMarkup(cur.avalibleCtxs)
            }
        }

        const ctx = cur.state.readingCtx
        const readType = cur.state.readingValue
        if (readType === 'name') {
            const argDesc = cur.descriptor.args.find(arg => arg.name === input)
            if (!argDesc) {
                return {
                    done: true,
                    markup: {
                        text: "Unknown argument name: " + input + ". Exiting...",
                    }
                }
            }

            let markup: IBuilderMarkup = {
                text: "",
            }
            if (!argDesc.options) { // no input
                cur.state.readingValue = 'name'
                markup = {
                    text: "Select next:",
                    options: [
                        ...defaultOptions,
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name))
                    ]
                }
            } else {
                cur.state.readingValue = 'value'
                markup = {
                    text: "Select argument value or type own:",
                    options: [
                        ...defaultOptions,
                        ...argDesc.options.map(opt => toMarkup(opt))
                    ]
                }
            }

            cur.state.read.push({ctx, name: input, value: null})

            return {
                done: false,
                markup
            }
        } else if (readType === 'value') {
            if (cur.state.read.length === 0) {
                return {
                    done: true,
                    markup: {
                        text: "No arguments to read. Exiting...",
                    }
                }
            }
            const argRead = cur.state.read[cur.state.read.length - 1]
            if (argRead) { // to not override: && argRead.value === null
                argRead.value = input
            }
            cur.state.readingValue = 'name'
            return {
                done: false,
                markup: {
                    text: "Select argument name:",
                    options: [
                        ...defaultOptions,
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name))
                    ]
                }
            }
        } else {
            return {
                done: true,
                markup: {
                    text: "Unknown reading value type: " + readType
                }
            }
        }
    }

    handle(userId: string, _input: string): IHandleResult {
        const res = this.handleInner(userId, _input)
        if (res.done) {
            this.stopBuild(userId)
        }
        return res
    }
}


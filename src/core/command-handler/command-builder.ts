import { unique } from "@core/utils/array"
import {
    ICommandBuilderMarkup,
    IBuilderMarkupOption,
    ICmdBuildingState,
    ICmdBuildResult,
    ICmdBuilderHandleResult,
    ICommandDescriptor,
    ReadingCtxType
} from "./types"
import {
    DefaultBuilderCallbacks,
    defaultBuilderMarkupOptions
} from "./constants"

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

// TOO FAKING IDIOTING LOGIC
// BUT ITS WORK!!!!!!!!

// TODO mark readed args with * start line marker to make it easier to read
export class CommandBuilder {
    private usersBuildingQueue: Map<string, ICmdBuildingState> = new Map()

    constructor() {

    }

    isUserOnBuild(userId: string) {
        if (this.usersBuildingQueue.has(userId)) {
            return true
        }
        return false
    }

    private stopBuild(userId: string) {
        console.log("__ done __")
        this.usersBuildingQueue.delete(userId)
    }

    private build(userId: string): ICmdBuildResult|null {
        const curr = this.usersBuildingQueue.get(userId)
        if (!curr) {
            return null
        }

        return {
            command: curr.command,
            args: curr.state.read
        }
    }

    startBuild(userId: string, command: string, desc: ICommandDescriptor, contexts: ReadingCtxType[] = ['args']): ICommandBuilderMarkup {
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
                ...initialCtxOptions.map(arg => toMarkup(arg.name)),
                ...defaultBuilderMarkupOptions,
            ]
        }
    }

    private isAllRead(bs: ICmdBuildingState) {
        const { read } = bs.state

        for (const darg of bs.descriptor.args) {
            if (!read.find(arg => arg.name === darg.name && (darg.options ? arg.value != "" && arg.value : true))) {
                return false
            }
        }
        
        return true
    }

    // ridiculous logic implementation of state machine :((
    private handleInner(userId: string, _input: string): ICmdBuilderHandleResult {
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
                            ...cur.descriptor.args.filter(arg => arg.ctx === input).map(arg => toMarkup(arg.name)),
                            ...defaultBuilderMarkupOptions,
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

        if (input === DefaultBuilderCallbacks.cancel) {
            this.stopBuild(userId)
            return {
                done: true,
                markup: {
                    text: "Build canceled",
                }
            }
        }

        if (input === DefaultBuilderCallbacks.execute) {
            const res = this.build(userId)
            return {
                done: true,
                built: res ? res : undefined,
                markup: {
                    text: res ? "Build success" : "Build failed",
                }
            }
        }

        if (input === DefaultBuilderCallbacks.switchCtx) {
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

            let markup: ICommandBuilderMarkup = {
                text: "",
            }
            if (!argDesc.options) { // no input
                cur.state.readingValue = 'name'
                markup = {
                    text: "Select next:",
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name)),
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            } else {
                cur.state.readingValue = 'value'
                markup = {
                    text: "Select argument value or type own:",
                    options: [
                        ...argDesc.options.map(opt => toMarkup(opt)),
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            }

            cur.state.read.push({ctx, name: input, value: ''})

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

            // is last value
            if (this.isAllRead(cur)) {
                const res = this.build(userId)
                if (res) {
                    return {
                        done: true,
                        built: res,
                        markup: {
                            text: "Build success",
                        }
                    }
                }
            }

            return {
                done: false,
                markup: {
                    text: "Select argument name:",
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name)),
                        ...defaultBuilderMarkupOptions,
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

    handle(userId: string, _input: string): ICmdBuilderHandleResult {
        const res = this.handleInner(userId, _input)
        if (res.done) {
            this.stopBuild(userId)
        }
        return res
    }
}


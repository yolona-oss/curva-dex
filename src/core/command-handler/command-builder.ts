import { unique } from "@core/utils/array"
import {
    ICmdBuilderMarkup,
    ICmdBuilderMarkupOption,
    ICmdBuildingState,
    ICmdBuildResult,
    ICmdBuilderHandleResult,
    IBuilderCmdDesc,
    ReadingCtxType,
    ICmdBuilderMarkupOptionType,
    IBuilderCmdArgReadResult
} from "./types"
import {
    DefaultBuilderCallbacks,
    defaultBuilderMarkupOptions
} from "./constants"
import log from "@core/utils/logger"
import { UiUnicodeSymbols } from "@core/ui"

function toMarkup(opt: string, type: ICmdBuilderMarkupOptionType, cb_value = opt, isRead: boolean = false): ICmdBuilderMarkupOption {
    return {
        text: opt,
        type: type,
        isRead,
        callback_data: cb_value
    }
}

function toSwitchCtxMarkup(ctxs: ReadingCtxType[], current: ReadingCtxType): ICmdBuilderMarkup {
    return {
        text: "Switch to reading context. Current context: " + current,
        options: ctxs.map(ctx => toMarkup(ctx, "value", ctx, false))
    }
}

// TOO FAKING IDIOTING LOGIC
// BUT ITS WORK!!!!!!!!

// TODO mark readed args with * start line marker to make it easier to read
export class CommandBuilder {
    private usersBuildingQueue: Map<string, ICmdBuildingState> = new Map()

    constructor() {

    }

    //userBuildString(userId: string, command: string): string {
    //    if (!this.isUserOnBuild(userId)) {
    //        return ""
    //    }
    //
    //    const readArgToStr = (arg: IBuilderCmdArgReadResult) => {
    //        switch (arg.ctx) {
    //            case "args":
    //
    //                break;
    //            case "config":
    //                break;
    //            case "params":
    //                break;
    //            case "message":
    //                break;
    //        }
    //    }
    //    const bstate = this.usersBuildingQueue.get(userId)!
    //
    //}

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

    private isAllRead(bs: ICmdBuildingState) {
        const { read } = bs.state

        for (const darg of bs.descriptor.args) {
            if (!read.find(arg => arg.name === darg.name && (darg.pairOptions ? arg.value != "" && arg.value : true))) {
                return false
            }
        }

        return true
    }

    private isDefaultCb(input: string) {
        return [
            DefaultBuilderCallbacks.cancel,
            DefaultBuilderCallbacks.execute,
            DefaultBuilderCallbacks.switchCtx
        ].includes(input)
    }

    private readDefaultCb(cur: ICmdBuildingState, userId: string, input: string) {
        if (input === DefaultBuilderCallbacks.cancel) {
            this.stopBuild(userId)
            return {
                done: true,
                markup: {
                    text: "Build canceled",
                }
            }
        } else if (input === DefaultBuilderCallbacks.execute) {
            const res = this.build(userId)
            return {
                done: true,
                built: res ? res : undefined,
                markup: {
                    text: res ? "Build success" : "Build failed",
                }
            }
        } else if (input === DefaultBuilderCallbacks.switchCtx) {
            cur.state.readingValue = 'ctx'
            return {
                done: false,
                markup: toSwitchCtxMarkup(cur.avalibleCtxs, cur.state.readingCtx)
            }
        } else {
            throw "Unknown default callback: " + input
        }
    }

    private readCtxValue(cur: ICmdBuildingState, input: string) {
        if (cur.avalibleCtxs.includes(input as any)) {
            cur.state.readingCtx = input as ReadingCtxType
            cur.state.readingValue = 'name'
            return {
                done: false,
                markup: {
                    text: `${UiUnicodeSymbols.success} Ctx switched to: "${input}". Select argument name:`,
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === input).map(arg => toMarkup(arg.name, "name")),
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

    private readPairValue(cur: ICmdBuildingState, userId: string, input: string) {
        const ctx = cur.state.readingCtx
        const readType = cur.state.readingValue

        if (readType === 'name') {
            const argDesc = cur.descriptor.args.find(arg => arg.name.toLowerCase() === input.toLowerCase())
            if (!argDesc) {
                return {
                    done: true,
                    markup: {
                        text: `Unknown argument name: "${input}". Avalible names(ctx: ${ctx}): ${cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => arg.name)}. Exiting...`,
                    }
                }
            }

            let markup: ICmdBuilderMarkup = {
                text: "",
            }
            if (!argDesc.pairOptions && argDesc.standalone) { // no input
                cur.state.readingValue = 'name'
                markup = {
                    text: "Select next:",
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name, "name")),
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            } else {
                cur.state.readingValue = 'value'
                markup = {
                    text: "Select argument value or type own:",
                    options: [
                        ...argDesc.pairOptions?.map(opt => toMarkup(opt, "value"))??[],
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            }

            cur.state.read.push({
                ctx,
                name: input,
                value: argDesc.standalone ? input : '',
                isStandalone: argDesc.standalone
            })

            return {
                done: false,
                markup
            }
        } else if (readType === 'value') {
            if (cur.state.read.length === 0) {
                return {
                    done: true,
                    markup: {
                        text: "Error: Reading value before selected argument name. Exiting...",
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
                } else {
                    log.warn("Build failed when all values read")
                }
            }

            return {
                done: false,
                markup: {
                    text: `${UiUnicodeSymbols.hammer} Select argument name:`,
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name, "name")),
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            }
        } else {
            return {
                done: true,
                markup: {
                    text: `State error: Unknown reading state: "${readType}". Exiting...`
                }
            }
        }
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
                    text: `${UiUnicodeSymbols.cross} No active build for user: ${UiUnicodeSymbols.user} "${userId}"`,
                }
            }
        }

        if (cur.state.readingValue === 'ctx') {
            return this.readCtxValue(cur, input)
        }

        if (this.isDefaultCb(input)) {
            return this.readDefaultCb(cur, userId, input)
        }

        return this.readPairValue(cur, userId, input)
    }

    handle(userId: string, _input: string): ICmdBuilderHandleResult {
        const res = this.handleInner(userId, _input)
        if (res.done) {
            this.stopBuild(userId)
        }
        return res
    }

    startBuild(userId: string, command: string, desc: IBuilderCmdDesc, contexts: ReadingCtxType[]): ICmdBuilderMarkup {
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

        const args = desc.args.filter(v => v.ctx === 'args')
        const msgs = desc.args.filter(v => v.ctx === 'message')
        const params = desc.args.filter(v => v.ctx === 'params')
        const configs = desc.args.filter(v => v.ctx === 'config')

        let desc_str = ""
        const stroke = (str: string, pair: string) => `${pair[0]}${str}${pair[1]}`;

        [args, msgs, params, configs].forEach(descType => {
            desc_str += descType.map(v =>
                ` - ${stroke(v.name, v.required ? "<>" : "[]")} - ${v.description ?? "No description"}`
            ).join('\n') + "\n";
        })

        return {
            text: `${UiUnicodeSymbols.hammer} Run CmdBuilder\nBuilding command: "${command}".\nAvalible context: ${contexts.join(", ")}.\n${desc_str}`,
            options: [
                ...initialCtxOptions.map(arg => toMarkup(arg.name, "name")),
                ...defaultBuilderMarkupOptions,
            ]
        }
    }
}


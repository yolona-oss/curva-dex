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
import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"
import { CommandBuilderDescCompiler } from "./command-builder-desc-compiler"
import { CHComposer } from "./ch-composer"

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
        text: `${UiUnicodeSymbols.gear} Switch to reading context.\n -- ${UiUnicodeSymbols.magnifierGlass} Current context: ${UiUnicodeSymbols.arrowRight} "${current}"}`,
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

    static selectReadingContexts<UICtx extends BaseUIContext>(command: string, userId: string, chComposer: CHComposer<UICtx>): ReadingCtxType[] {
        const isService = chComposer.isService(command)
        const isActive = chComposer.isServiceActive(userId, command)

        return isService ?
            isActive ?
                ['message'] :
                ['params', 'config'] :
            ['args']
    }

    userBuildString(bstate: ICmdBuildingState, command: string, info = "", infoPrepend = true): string {
        let buildStr = `${UiUnicodeSymbols.hammer} Building ${command}\n\nReaded:`
        if (infoPrepend) {
            buildStr = `${info}\n${buildStr}`
        }

        const readArgToStr = (arg: IBuilderCmdArgReadResult) => {
            switch (arg.ctx) {
                case "args":
                    return ` -Arg ${UiUnicodeSymbols.hammer} ${arg.name}: ${arg.value}`
                case "config":
                    return ` - Config ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "params":
                    return ` - Params ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "message":
                    return ` - Message ${UiUnicodeSymbols.mail} ${arg.name}: ${arg.value}`
            }
        }
        for (const arg of bstate.state.read) {
            buildStr += '\n' + readArgToStr(arg)
        }
        if (!infoPrepend) {
            buildStr = `${buildStr}\n\n${info}`
        }
        return buildStr
    }

    isUserOnBuild(userId: string) {
        if (this.usersBuildingQueue.has(userId)) {
            return true
        }
        return false
    }

    private stopBuild(userId: string) {
        console.log("__ build done __")
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

    private isNameRead(cur: ICmdBuildingState, name: string) {
        for (const arg of cur.state.read) {
            if (arg.name === name) {
                return true
            }
        }
        return false
    }

    private readDefaultCb(cur: ICmdBuildingState, userId: string, input: string, inputSetteled: string) {
        if (inputSetteled === DefaultBuilderCallbacks.cancel) {
            this.stopBuild(userId)
            return {
                done: true,
                markup: {
                    text: `${UiUnicodeSymbols.decline} Build canceled`,
                }
            }
        } else if (inputSetteled === DefaultBuilderCallbacks.execute) {
            const res = this.build(userId)
            return {
                done: true,
                built: res ? res : undefined,
                markup: {
                    text: res ? `${UiUnicodeSymbols.success} Build success` : `${UiUnicodeSymbols.error} Build failed`,
                }
            }
        } else if (inputSetteled === DefaultBuilderCallbacks.switchCtx) {
            cur.state.readingValue = 'ctx'
            return {
                done: false,
                markup: toSwitchCtxMarkup(cur.avalibleCtxs, cur.state.readingCtx)
            }
        } else {
            throw `${UiUnicodeSymbols.error} Unknown default callback: ${UiUnicodeSymbols.arrowRight} "${input}"`
        }
    }

    private readCtxValue(cur: ICmdBuildingState, inputSetteled: string) {
        if (cur.avalibleCtxs.includes(inputSetteled as any)) {
            cur.state.readingCtx = inputSetteled as ReadingCtxType
            cur.state.readingValue = 'name'
            return {
                done: false,
                markup: {
                    text: this.userBuildString(cur, cur.command, `${UiUnicodeSymbols.success} Ctx switched to: "${inputSetteled}". Select argument name:`),
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === inputSetteled).map(arg => toMarkup(arg.name, "name")),
                        ...defaultBuilderMarkupOptions,
                    ]
                }
            }
        } else {
            return {
                done: true,
                markup: {
                    text: `${UiUnicodeSymbols.error} Unknown reading context: ${UiUnicodeSymbols.arrowRight} "${inputSetteled}"\n -- ${UiUnicodeSymbols.magnifierGlass} Avalible contexts: ${cur.avalibleCtxs.map(ctx => ` ${UiUnicodeSymbols.arrowRight} ${ctx}`)}.\n ${UiUnicodeSymbols.gear} Exiting...`,
                }
            }
        }
    }

    private readPairName(cur: ICmdBuildingState, _: string, input: string, inputSetteled: string) {
        if (this.isNameRead(cur, input)) {
            return {
                done: false,
                markup: {
                    text: this.userBuildString(cur, cur.command, `${UiUnicodeSymbols.error} Argument name already read: ${UiUnicodeSymbols.arrowRight} "${input}".`),
                    options: [
                        ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name, "name")),
                        ...defaultBuilderMarkupOptions
                    ]
                }
            }
        }

        let markup: ICmdBuilderMarkup = {
            text: "",
        }
        const ctx = cur.state.readingCtx
        const argDesc = cur.descriptor.args.find(arg => arg.name.toLowerCase() === inputSetteled)
        if (!argDesc) {
            return {
                done: true,
                markup: {
                    text: `${UiUnicodeSymbols.error} Unknown argument name: ${UiUnicodeSymbols.arrowRight} "${input}".\n\n -- Avalible names(current context: ${UiUnicodeSymbols.gear} ${ctx}): ${cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => ` ${UiUnicodeSymbols.arrowRight} ${arg.name}`)}.\n${UiUnicodeSymbols.gear} Aborting...`,
                }
            }
        } else {
            // HERE CAN PARSE POSITIONAL ARG
        }

        if (!argDesc.pairOptions && argDesc.standalone) { // no input
            cur.state.readingValue = 'name'
            const text = this.userBuildString(
                cur,
                cur.command,
                `Read standalone argument ${UiUnicodeSymbols.arrowRight} "${input}".\n${UiUnicodeSymbols.gear} Continue configuration...\nSelect next option:`, false
            )
            markup = {
                text,
                options: [
                    ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name, "name")),
                    ...defaultBuilderMarkupOptions,
                ]
            }
        } else {
            cur.state.readingValue = 'value'
            const text = this.userBuildString(
                cur,
                cur.command,
                `Select or type value for argument ${UiUnicodeSymbols.arrowRight} "${input}":`, false
            )
            markup = {
                text,
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
    }

    private readPairValue(cur: ICmdBuildingState, userId: string, input: string, _: string) {
        const ctx = cur.state.readingCtx
        if (cur.state.read.length === 0) {
            const text = this.userBuildString(
                cur,
                cur.command,
                `\n${UiUnicodeSymbols.error} No argument name selected before value input.\n${UiUnicodeSymbols.cross} Aborting...`,
                false
            )
            return {
                done: true,
                markup: {
                    text,
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

        const text = this.userBuildString(
            cur,
            cur.command,
            `Read value ${UiUnicodeSymbols.arrowRight} "${input}".\n${UiUnicodeSymbols.gear} Continue configuration...\nSelect next option:`,
        )
        return {
            done: false,
            markup: {
                text,
                options: [
                    ...cur.descriptor.args.filter(arg => arg.ctx === ctx).map(arg => toMarkup(arg.name, "name")),
                    ...defaultBuilderMarkupOptions,
                ]
            }
        }
    }

    private parsePairInput(cur: ICmdBuildingState, userId: string, input: string, inputSetteled: string) {
        const readType = cur.state.readingValue

        if (readType === 'name') {
            return this.readPairName(cur, userId, input, inputSetteled)
        } else if (readType === 'value') {
            return this.readPairValue(cur, userId, input, inputSetteled)
        } else {
            return {
                done: true,
                markup: {
                    text: `State error: Unknown reading state: ${UiUnicodeSymbols.arrowRight} "${readType}".\nAborting...`
                }
            }
        }
    }

    // ridiculous logic implementation of state machine :((
    private handleInner(userId: string, input: string): ICmdBuilderHandleResult {
        const inputSetteled = input.toLowerCase().trim()
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
            return this.readDefaultCb(cur, userId, input, inputSetteled)
        }

        return this.parsePairInput(cur, userId, input, inputSetteled)
    }

    handle(userId: string, input: string): ICmdBuilderHandleResult {
        const res = this.handleInner(userId, input)
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
            text: `${UiUnicodeSymbols.hammer} Run CmdBuilder\nBuilding command: ${UiUnicodeSymbols.arrowRight} "${command}".\nAvalible context: ${UiUnicodeSymbols.arrowRight} ${contexts.join(", ")}.\n${desc_str}`,
            options: [
                ...initialCtxOptions.map(arg => toMarkup(arg.name, "name")),
                ...defaultBuilderMarkupOptions,
            ]
        }
    }

    public async parseCompeteInput<UICtx extends BaseUIContext>(userId: string, command: string, input: string, ctx: UICtx, chComposer: CHComposer<UICtx>): Promise<ICmdBuildResult> {
        const chips: string[] = []
        const regex = /[^\s"]+|"([^"]*)"/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(input)) !== null) {
            chips.push(match[1] ? match[1] : match[0])
        }

        if (chips.length === 0) {
            return {
                command: "-Unknown-",
                args: []
            } as ICmdBuildResult
        }

        const compiler = new CommandBuilderDescCompiler<UICtx>()
        const descs = await compiler.compile(command, userId, chComposer, ctx)
        this.startBuild(userId, command, descs, CommandBuilder.selectReadingContexts(command, userId, chComposer))
        let buildingRes
        for (const chip of chips) {
            buildingRes = this.handle(userId, chip)
            if (buildingRes.done) {
                if (buildingRes.built) {
                    return buildingRes.built
                } else {
                    throw buildingRes.error ?? `${UiUnicodeSymbols.cross} Build failed(${UiUnicodeSymbols.info} done but not built):\n -- ${buildingRes.markup?.text ?? `${UiUnicodeSymbols.error} Unknown error`}`
                }
            }
        }
        throw `${UiUnicodeSymbols.cross} Build by chips failed.\n -- ${UiUnicodeSymbols.magnifierGlass} Input: ${UiUnicodeSymbols.arrowRight} "${input}".\n -- ${UiUnicodeSymbols.magnifierGlass} Result: ${UiUnicodeSymbols.arrowRight} "${buildingRes?.built ?? "Unknown result"}.\n -- ${UiUnicodeSymbols.magnifierGlass} Error: ${UiUnicodeSymbols.arrowRight} "${buildingRes?.error ?? "Unknown error"}"`
    }
}


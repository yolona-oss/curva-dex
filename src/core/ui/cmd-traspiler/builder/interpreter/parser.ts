import { deepClone } from "@core/utils/object"
import { IArgumentCompiled, IUICommandDescriptor } from '@core/ui/types'
import { CmdArgumentContextType } from "@core/ui/types/command";
import { encodePositionalName, decodePositionalName } from "@core/ui/types/command";
import { StateSnaper } from "./state-span";
import { CBLexerToken } from "./lexer";

import log from "@core/application/logger";
import { Chain, chainFallbackHandler, chainHandlerFactory, IChainHandler } from "@core/utils/chain";

/**
 * @see ParserStateType to get more info
 */
export type ParserStateType =
  'PAIR'        // --pair_option
| 'STAND_ALONE' // -o or -option_without_pair
| 'POSITIONAL'  // simple text
| 'CTX'         // context name from avaliable
| 'PAIR_VALUE'  // value for PAIR
| 'IDLE'        // idle state, waits for pair, standalone, positional or ctx

/**
 * @see ParserPerformedAction
 */
export type ParserPerformedAction =
  'none' // no action

| 'set-pair'       // set pair name and value
| 'set-pair-name'  // set only pair name
| 'set-pair-value' // set only pair value after pair name setted
| 'set-standalone' // set standalone option
| 'set-positional' // set positional argument

| 'ctx-switch'    // reading context switched to new
| 'ctx-selection' // state switched to context selection

| 'removed-pair'       // pair was removed
| 'removed-standalone' // standalone was removed
| 'removed-positional' // positional was removed

export interface ICBParserStateRaw {
    command: string
    avaliableCtxs: CmdArgumentContextType[]
    descriptor: IUICommandDescriptor
    currentCtx: CmdArgumentContextType
    waitingFor: ParserStateType
    read: IArgumentCompiled[]
}

export type PChainReq = CBLexerToken
//export type PChainRes = ParserPerformedAction
//export type PChainHandler = IChainHandler<PChainReq, PChainRes>

export class CBParser<PChainResGType extends ParserPerformedAction|string = ParserPerformedAction> {
    private command!: string
    private switchCtxKeyword!: string
    private avaliableCtxs!: CmdArgumentContextType[]
    private currentCtx!: CmdArgumentContextType
    private descriptor!: IUICommandDescriptor
    private state!: ParserStateType
    private read!: IArgumentCompiled[]

    private snaper = new StateSnaper()

    private tknParseChain: Chain<PChainReq, PChainResGType>

    constructor(
        command: string,
        avalibleCtxs: CmdArgumentContextType[],
        descriptor: IUICommandDescriptor,
        switchCtxKeyword: string,
        initialCtx: CmdArgumentContextType|null = null
    ) {
        this.reset(command, avalibleCtxs, descriptor, switchCtxKeyword, initialCtx)
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()
    }

    /**
     * applies handler to beginning of chain then you must pass handler in reverse order
     * I will do in feature appling in normal order: [...<applied by user handler in asc order>, ...<parser handler>]
     */
    public applyHandler(handler: IChainHandler<PChainReq, PChainResGType>) {
        this.tknParseChain.useFirst(handler)
    }

    private reset(
        cmd: string,
        avaliableCtxs: CmdArgumentContextType[],
        descriptor: IUICommandDescriptor,
        switchCtxKeyword: string,
        initialCtx: CmdArgumentContextType|null = null
    ) {
        log.trace(`--RESET--`)
        this.setupChain()

        this.switchCtxKeyword = switchCtxKeyword
        this.snaper = new StateSnaper()
        this.command = cmd

        avaliableCtxs.forEach(ctx => this.validateContext(ctx))
        this.avaliableCtxs = avaliableCtxs
        this.descriptor = descriptor

        this.currentCtx = initialCtx ? initialCtx : this.avaliableCtxs[0]
        this.state = 'IDLE'
        this.read = []
    }

    /* -------------------- *
     * 'TEXT', 'SINGLE_DASH', 'DOUBLE_DASH'
     * 'IDLE', 'CTX', 'POSITIONAL', 'PAIR', 'PAIR_VALUE'
     *
     * State chenges
     * TEXT -> CTX: IDLE
     * TEXT -> POSITIONAL: IDLE
     *
     * SINGLE_DASH -> STAND_ALONE: IDLE
     * DOUBLE_DASH -> PAIR -> PAIR_VALUE: IDLE
     * -------------------- */

    private setupChain() {
        const setCtx = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setCtx`)
            if (req.type == 'TEXT' && req.value) {
                try {
                    return this.switchToContext(req.value as CmdArgumentContextType)
                } catch (e) {
                    log.debug(`Switch to context error: ${e}`)
                }
            }
            log.trace(`Handler: setCtx failed`)
            return
        })

        const setCtxSelection = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setCtxSelection`)
            if (req.type == 'TEXT' && this.state == 'IDLE' && req.value && req.value === this.switchCtxKeyword) {
                try {
                    return this.switchToContextSelection()
                } catch (e) {
                    log.debug(`Switch to context error: ${e}`)
                }
            }
            log.trace(`Handler: setCtxSelection failed`)
            return
        })

        const setPos = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setPos`)
            if (req.type == 'TEXT' && req.value) {
                return this.setPositional(req.value)
            }
            log.trace(`Handler: setPos failed`)
            return
        })

        const setStandalone = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setStandalone`)
            if (req.type == 'SINGLE_DASH' && req.value) {
                this.state = 'STAND_ALONE'
                return this.setStandalone(req.value)
            }
            log.trace(`Handler: setStandalone failed`)
            return
        })

        const setName = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setName`)
            if (req.type == 'DOUBLE_DASH' && req.value) {
                this.state = 'PAIR'
                return this.setName(req.value)
            }
            log.trace(`Handler: setName failed`)
            return
        })

        const setValue = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`Handler: setValue`)
            if (req.type == 'DOUBLE_DASH' && req.value) {
                return this.setValue(req.value)
            }
            log.trace(`Handler: setValue failed`)
            return
        })

        log.trace(`--Registering parser chain handlers--\nFallback value: 'none'`)
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()
        this.tknParseChain.use(setCtxSelection)
        this.tknParseChain.use(setCtx)
        this.tknParseChain.use(setPos)
        this.tknParseChain.use(setStandalone)
        this.tknParseChain.use(setName)
        this.tknParseChain.use(setValue)
        this.tknParseChain.use(chainFallbackHandler<PChainReq, PChainResGType>('none' as PChainResGType))
        log.trace(`--Parser chain handlers registered. Count: ${this.tknParseChain.Handlers.length}--`)
    }

    private validateContext(ctx: CmdArgumentContextType) {
        if (ctx.length == 0) {
            throw `Invalid context name "${ctx}"`
        }
        if (/[^a-zA-Z0-9_]/.test(ctx)) {
            throw `Invalid context name "${ctx}"`
        }
    }

    /**
     * @returns deep clone of current state
     */
    toState(): ICBParserStateRaw {
        return deepClone({
            command: this.command,
            avaliableCtxs: this.avaliableCtxs,
            descriptor: this.descriptor,
            currentCtx: this.currentCtx,
            waitingFor: this.state,
            read: this.read,
        })
    }

    private snap() {
        this.snaper.memorize({
            currentCtx: this.currentCtx,
            waitingFor: this.state,
            read: deepClone(this.read)
        })
    }

    get WaitingFor() {
        return this.state
    }

    get CurrentContext() {
        return this.currentCtx
    }

    get AvaliableContexts() {
        return this.avaliableCtxs
    }

    IsContextInAvaliable(ctx: CmdArgumentContextType) {
        return this.avaliableCtxs.includes(ctx)
    }

    get ReadArgs() {
        return this.read
    }

    get Descriptor() {
        return this.descriptor
    }

    get BuildingCommand() {
        return this.command
    }

    get DescPosArgs() {
        return this.descriptor.args.filter(arg => arg.position != null)
    }

    get DescPairArgs() {
        return this.descriptor.args.filter(arg => arg.position == null)
    }

    get ReadPositionals() {
        return this.read.filter(arg => arg.position != null).sort((arg1, arg2) => arg1.position! - arg2.position!)
    }

    get DescPositionals() {
        return this.descriptor.args.filter(arg => arg.position != null).sort((arg1, arg2) => arg1.position! - arg2.position!)
    }

    get IsDescArgsEmpty() {
        return this.descriptor.args.length === 0
    }

    get IsDescArgsRequiredEmpty() {
        return this.descriptor.args.filter(arg => arg.required).length === 0
    }

    /**
    * @returns current context if passed, otherwise current
    */
    private ctxOrCurrent(ctx?: CmdArgumentContextType): CmdArgumentContextType {
        return ctx ? ctx : this.currentCtx
    }

    private isReadFromDescriptor(desc: IUICommandDescriptor) {
        for (const arg_d of desc.args) {
            if (arg_d.position != null) {
                if (!this.isPosRead(arg_d.position)) {
                    return false
                }
            } else {
                if (!this.isNameRead(arg_d.name)) {
                    return false
                }
            }
        }

        return true
    }

    isEveryRead() {
        return this.isReadFromDescriptor(this.descriptor)
    }

    isRequiredRead() {
        const requiredOnly = deepClone(this.descriptor)
        requiredOnly.args = requiredOnly.args.filter(arg => arg.required)
        return this.isReadFromDescriptor(requiredOnly)
    }

    isNameRead(input: string, ctx?: CmdArgumentContextType) {
        const searchArray = this.read.filter(arg => arg.ctx === (ctx ?? this.currentCtx))
        for (const read of searchArray) {
            if (read.name === input && read.value != '') {
                return true
            } else if (read.name.startsWith('positional-')) {
                const { name } = decodePositionalName(read.name)
                if (name === input) {
                    return true
                }
            }
        }
        return false
    }

    isPosRead(pos: number, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        return this.read.some(arg => arg.position === pos && arg.ctx === ctx && arg.value != '')
    }

    findDescriptor(name: string, ctx?: CmdArgumentContextType) {
        return this.descriptor.args.find(arg => arg.name === name && arg.ctx === (ctx ?? this.currentCtx))
    }

    ////////

    /**
     * initiates context selection
     */
    private switchToContextSelection(): PChainResGType {
        this.snap()
        if (this.state != 'IDLE') {
            throw 'On switchToContextSelection Unexpected waitingFor: ' + this.state
        }
        this.state = 'CTX'

        return 'ctx-selection' as PChainResGType
    }

    /**
     * switches to new context
     */
    private switchToContext(ctx: CmdArgumentContextType): PChainResGType {
        this.snap()
        if (this.state != 'CTX') {
            throw 'On switchToContext Unexpected waitingFor: ' + this.state
        }
        if (!this.avaliableCtxs.includes(ctx)) {
            throw `Cannot transit to context: ${ctx}`
        }
        this.currentCtx = ctx
        this.state = 'IDLE'

        return 'ctx-switch' as PChainResGType
    }

    /**
     * creates entry for positional
     */
    private setPositional(input: string, pos?: number): PChainResGType {
        this.snap()
        if (this.state != 'IDLE') {
            throw 'On setPositional Unexpected waitingFor: ' + this.state
        }

        const maxPos = this.descriptor.args.filter(arg => arg.position && arg.ctx == this.currentCtx).length
        pos = pos ?? this.ReadPositionals.length + 1
        if (pos > maxPos) {
            throw `Position exceeded: max: ${maxPos}, passed: ${pos}. `
        }

        const desc = this.descriptor.args.find(arg => arg.position === pos && arg.ctx === this.currentCtx)
        if (!desc) {
            throw `Cannot find descriptor for positional: ${pos}`
        }
        this.read.push({
            name: encodePositionalName(desc.name, pos),
            value: input,
            standalone: false,
            position: pos,
            ctx: this.currentCtx
        })

        this.state = 'IDLE'

        return 'set-positional' as PChainResGType
    }

    /**
     * creates entry for standalone
     */
    private setStandalone(input: string): PChainResGType {
        this.snap()
        if (this.state != 'IDLE') {
            throw 'On setStandalone Unexpected waitingFor: ' + this.state
        }
        this.read.push({
            name: input,
            value: '',
            standalone: true,
            position: null,
            ctx: this.currentCtx
        })
        return 'set-standalone' as PChainResGType
    }

    /**
     * creates entry for pair and set its name
     */
    private setName(input: string): PChainResGType {
        this.snap()
        if (this.state != 'PAIR') {
            throw 'On setName Unexpected waitingFor: ' + this.state
        }

        this.removePairRead(input)

        const desc = this.findDescriptor(input)!
        this.read.push({
            name: input,
            value: '',
            standalone: false,
            position: desc.position,
            ctx: desc.ctx
        })

        this.state = 'PAIR_VALUE'

        return 'set-pair-name' as PChainResGType
    }

    /**
    * set value to pair of last read pair name
    */
    private setValue(input: string): PChainResGType {
        this.snap()
        if (this.state != 'PAIR_VALUE') {
            throw 'Unexpected waitingFor: ' + this.state
        }
        if (this.read.length === 0) {
            throw 'Unexpected empty read'
        }

        this.read[this.read.length - 1].value = input
        this.state = 'IDLE'

        return 'set-pair-value' as PChainResGType
    }

    private removePairRead(input: string, fromCtx?: CmdArgumentContextType): PChainResGType {
        this.snap()
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.name !== input && arg.ctx !== fromCtx)
        return before - this.read.length === 1 ? 'removed-pair' as PChainResGType : 'none' as PChainResGType
    }

    private removePosRead(pos: number, fromCtx?: CmdArgumentContextType): PChainResGType {
        this.snap()
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.position !== pos && arg.ctx !== fromCtx)
        return before - this.read.length === 1 ? 'removed-positional' as PChainResGType : 'none' as PChainResGType
    }

    private removeStandaloneRead(fromCtx?: CmdArgumentContextType): PChainResGType {
        this.snap()
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.standalone && arg.ctx !== fromCtx)
        return before - this.read.length === 1 ? 'removed-standalone' as PChainResGType : 'none' as PChainResGType
    }

    parseNextToken(token: CBLexerToken): PChainResGType {
        this.setupChain()
        log.trace(`Parsing token: ${token.type}`)
        log.trace(`Parsing throw handlers: ${this.tknParseChain.Handlers.length}`)
        return this.tknParseChain.handle(token)
    }
}

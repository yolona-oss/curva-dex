//
// TODO add state managment more organized
//      handlers are sooo garbage its need to be refactored
//

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
| 'WAIT_NEXT_V' // waiting for next value setted by TODO

const stateTransiteMap: Record<ParserStateType, ParserStateType[]> = {
    'IDLE': ['CTX', 'STAND_ALONE', 'POSITIONAL', 'PAIR', 'PAIR_VALUE', 'WAIT_NEXT_V', 'IDLE'],
    'CTX': ['IDLE'],
    'PAIR_VALUE': ['IDLE'],
    'STAND_ALONE': ['IDLE'],
    'POSITIONAL': ['IDLE'],
    'PAIR': ['PAIR_VALUE'],
    'WAIT_NEXT_V': ['IDLE', 'STAND_ALONE', 'POSITIONAL']
}

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

| 'wait-next-inited'   // waiting for next value setted

export interface ICBParserStateRaw {
    command: string
    avaliableCtxs: CmdArgumentContextType[]
    descriptor: IUICommandDescriptor
    currentCtx: CmdArgumentContextType
    state: ParserStateType
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

    private _appliedHandlers = new Array<IChainHandler<PChainReq, PChainResGType>>()
    public applyHandler(handler: IChainHandler<PChainReq, PChainResGType>) {
        this._appliedHandlers.push(handler)
    }

    private reset(
        cmd: string,
        avaliableCtxs: CmdArgumentContextType[],
        descriptor: IUICommandDescriptor,
        switchCtxKeyword: string,
        initialCtx: CmdArgumentContextType|null = null
    ) {
        log.trace(`--RESET-PARSER-STATE--`)
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

        log.trace(`--Registering parser chain handlers--\nFallback value: 'none'`)
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()

        const setCtxHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setCtxHandler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && this.state === 'CTX' && this.IsContextInAvaliable(req.value)) {
                return this.switchToContext(req.value as CmdArgumentContextType)
            }
            return
        })

        const setCtxSelectionHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setCtxSelectionHandler: ${req.value}`)
            if (req.type == 'TEXT' && this.state == 'IDLE' && req.value && req.value === this.switchCtxKeyword) {
                return this.switchToContextSelection()
            }
            return
        })

        const setNextReadValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setNextReadValueHandler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && this.state == 'IDLE') {
                if (!this.isDescriptorExists(req.value)) {
                    console.log(`Descriptor not found: ${req.value}`)
                    return
                }
                console.log(`Descriptor found: ${req.value}`)
                return this.setNextValueSetting(req.value)
            }
            return
        })

        const setFromNextReadValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setFromNextReadValueHandler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && this.state == 'WAIT_NEXT_V') {
                this.setFromNextValue(req.value)
            }
            return
        })

        const setPairNameHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setPairNameHandler: ${req.value}`)
            if (req.type == 'DOUBLE_DASH' && req.value && this.state == 'IDLE') {
                this.transitState('PAIR')
                return this.setPairName(req.value)
            }
            return
        })

        const setPairValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setPairValueHandler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && this.state == 'PAIR_VALUE' && this.read.length !== 0) {
                return this.setPairValue(req.value)
            }
            return
        })

        const setPosHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setPosHandler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && this.state == 'IDLE') {
                try {
                    return this.setPositional(req.value)
                } catch (e) {
                    log.error(e)
                }
            }
            return
        })

        const setStandaloneHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            log.trace(`setStandaloneHandler: ${req.value}`)
            if (req.type == 'SINGLE_DASH' && req.value && this.state == 'IDLE') {
                this.transitState('STAND_ALONE')
                return this.setStandalone(req.value)
            }
            return
        })

        for (const hndl of this._appliedHandlers) {
            console.log(hndl)
            this.tknParseChain.use(hndl)
        }

        this.tknParseChain.use(setCtxHandler)
        this.tknParseChain.use(setCtxSelectionHandler)
        this.tknParseChain.use(setPairNameHandler)
        this.tknParseChain.use(setPairValueHandler)

        // must be before setting positional and standalone now
        this.tknParseChain.use(setFromNextReadValueHandler)
        this.tknParseChain.use(setNextReadValueHandler)

        this.tknParseChain.use(setPosHandler)
        this.tknParseChain.use(setStandaloneHandler)
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
    toRawState(): ICBParserStateRaw {
        return deepClone({
            command: this.command,
            avaliableCtxs: this.avaliableCtxs,
            descriptor: this.descriptor,
            currentCtx: this.currentCtx,
            state: this.state,
            read: this.read,
        })
    }

    private snap() {
        this.snaper.memorize({
            currentCtx: this.currentCtx,
            state: this.state,
            read: deepClone(this.read)
        })
    }

    get State() {
        return this.state
    }

    get CurrentContext() {
        return this.currentCtx
    }

    get AvaliableContexts() {
        return this.avaliableCtxs
    }

    IsContextInAvaliable(ctx: string) {
        return this.avaliableCtxs.includes(ctx as CmdArgumentContextType)
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

    get NextPositionalInd() {
        return this.ReadPositionals.length + 1
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

    isRead(input: string, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        return this.read.some(arg => arg.name === input && arg.ctx === ctx)
    }

    isNameRead(input: string, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        const searchArray = this.read.filter(arg => arg.ctx === (ctx))
        for (const read of searchArray) {
            if (read.name === input && read.value != '') {
                return true
            } else if (read.name.startsWith('positional-') && read.value != '') {
                const { name } = decodePositionalName(read.name)
                if (name === input) {
                    return true
                }
            }
        }
        return false
    }

    isStandaloneRead(input: string, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        return this.read.some(arg => arg.name === input && arg.ctx === ctx && arg.standalone === true)
    }

    isPosRead(pos: number, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        return this.read.some(arg => arg.position === pos && arg.ctx === ctx && arg.value != '')
    }

    findDescriptor(name: string, ctx?: CmdArgumentContextType) {
        return this.descriptor.args.find(arg => arg.name === name && arg.ctx === (ctx ?? this.currentCtx))
    }

    isDescriptorExists(name: string, ctx?: CmdArgumentContextType) {
        return this.findDescriptor(name, ctx) !== undefined
    }

    ////////


    private nextValueSet?: { type: 'standalone'|'positional', arg_name: string }
    get NextValueSetType() {
        return this.nextValueSet?.type
    }
    get NextValueSetValue() {
        return this.nextValueSet?.arg_name
    }
    
    setNextValueSetting(input: string): PChainResGType {
        this.snap()

        const desc = this.findDescriptor(input)!

        this.nextValueSet = {
            type: desc.position != null ? 'positional' : 'standalone',
            arg_name: input
        }
        this.transitState('WAIT_NEXT_V')
        return 'wait-next-inited' as PChainResGType
    }

    /**
     * set read from this.nextValueSet if its dont undef
     */
    setFromNextValue(input: string): PChainResGType {
        this.snap()
        let ret

        if (this.nextValueSet === undefined) {
            throw `Can't set value from undefined next value setting`
        }

        if (this.nextValueSet.type === 'standalone') {
            ret = this.setStandalone(this.nextValueSet.arg_name)
        } else if (this.nextValueSet.type === 'positional') {
            const pos_desc = this.findDescriptor(this.nextValueSet.arg_name)!
            ret = this.setPositional(input, pos_desc.position!)
        } else {
            throw `Can't set value from undefined next value setting`
        }

        this.transitState('IDLE')

        return ret
    }

    private transitState(to: ParserStateType): void {
        log.trace(`Parser change state from ${this.state} to ${to}`)
        if (to === this.state) {
            return
        }

        if (stateTransiteMap[this.state].includes(to)) {
            this.state = to
            return
        }

        throw new Error(`Can't transite from ${this.state} to ${to}. Invalid state transition`)
    }

    /**
     * initiates context selection
     */
    private switchToContextSelection(): PChainResGType {
        this.snap()
        this.transitState('CTX')

        return 'ctx-selection' as PChainResGType
    }

    /**
     * switches to new context
     */
    private switchToContext(ctx: CmdArgumentContextType): PChainResGType {
        this.snap()
        this.currentCtx = ctx

        this.transitState('IDLE')

        return 'ctx-switch' as PChainResGType
    }

    /**
     * creates entry for positional
     */
    private setPositional(value: string, pos?: number): PChainResGType {
        this.snap()
        const maxPos = this.descriptor.args.filter(arg => arg.position && arg.ctx == this.currentCtx).length
        pos = pos ?? this.NextPositionalInd
        if (pos > maxPos) {
            throw `Position exceeded: max: ${maxPos}, passed: ${pos}. `
        }
        const desc = this.descriptor.args.find(arg => arg.position === pos && arg.ctx === this.currentCtx)
        if (!desc) {
            throw `Cannot find descriptor for positional: ${pos}`
        }
        this.removePosRead(pos)
        this.read.push({
            name: encodePositionalName(desc.name, pos),
            value: value,
            standalone: false,
            position: pos,
            ctx: this.currentCtx
        })

        this.transitState('IDLE')

        return 'set-positional' as PChainResGType
    }

    /**
     * creates entry for standalone
     * NOW ITS USE TOGGLE LOGIC
     */
    private setStandalone(input: string): PChainResGType {
        this.snap()

        if (this.isStandaloneRead(input)) {
            this.removeStandaloneRead(input)
            return 'removed-standalone' as PChainResGType
        } else {
            this.read.push({
                name: input,
                value: 'true',
                standalone: true,
                position: null,
                ctx: this.currentCtx
            })
            return 'set-standalone' as PChainResGType
        }
    }

    /**
     * creates entry for pair and set its name
     */
    private setPairName(input: string): PChainResGType {
        this.snap()
        this.removePairRead(input)

        const desc = this.findDescriptor(input)!
        this.read.push({
            name: input,
            value: '',
            standalone: false,
            position: desc.position,
            ctx: desc.ctx
        })

        this.transitState('PAIR_VALUE')

        return 'set-pair-name' as PChainResGType
    }

    /**
    * set value to pair of last read pair name
    */
    private setPairValue(input: string): PChainResGType {
        this.snap()
        this.read[this.read.length - 1].value = input
        this.transitState('IDLE')

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

    private removeStandaloneRead(name: string, fromCtx?: CmdArgumentContextType): PChainResGType {
        this.snap()
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.standalone && arg.name !== name && arg.ctx !== fromCtx)
        return before - this.read.length === 1 ? 'removed-standalone' as PChainResGType : 'none' as PChainResGType
    }

    parseNextToken(token: CBLexerToken): PChainResGType {
        this.setupChain()
        log.trace(`Parsing token: ${token.type}`)
        log.trace(`Parsing throw handlers queue len of ${this.tknParseChain.Handlers.length}`)
        return this.tknParseChain.handle(token)
    }
}

//
// TODO add state managment more organized
//      handlers are sooo garbage its need to be refactored
//

import { deepClone } from "@core/utils/object"
import { IArgumentCompiled, IUICommandDescriptor } from '@core/ui/types'
import { CmdArgumentContextType, IArgumentDescriptor } from "@core/ui/types/command";
import { encodePositionalName, decodePositionalName } from "@core/ui/types/command";
import { StateSnaper } from "./state-span";
import { CBLexerToken } from "./lexer";

import log from "@core/application/logger";
import { Chain, createChainFallbackHandler, chainHandlerFactory, IChainHandler } from "@core/utils/chain";
import { removeObjectByFieldsMutate } from "@core/utils/array";
import { getArgumentDescType, isArgumentDescPair, isArgumentDescPositional, isArgumentDescStandalone, useDescriptorCreateArgument } from "@core/ui/types/command/argument/descriptor-helpers";

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

// TODO create back to noraml mechanism for undo after throw inside parser

// SPLIT THIS CLASS
export class CBParser<PChainResGType extends ParserPerformedAction|string = ParserPerformedAction> {
    private readonly command!: string
    private readonly switchCtxKeyword!: string
    private readonly avaliableCtxs!: CmdArgumentContextType[]
    private currentCtx!: CmdArgumentContextType
    private readonly descriptor!: IUICommandDescriptor
    private state!: ParserStateType
    private arguments!: IArgumentCompiled[]

    private snaper = new StateSnaper()

    private tknParseChain: Chain<PChainReq, PChainResGType>

    constructor(
        command: string,
        avaliableCtxs: CmdArgumentContextType[],
        descriptor: IUICommandDescriptor,
        switchCtxKeyword: string,
        initialCtx: CmdArgumentContextType|null = null
    ) {
        log.trace(`Parser created for command: ${command}\nDescriptor: ${JSON.stringify(descriptor)}`)
        this.setupChain()

        this.switchCtxKeyword = switchCtxKeyword
        this.snaper = new StateSnaper()
        this.command = command

        avaliableCtxs.forEach(ctx => this.validateContext(ctx))
        this.avaliableCtxs = avaliableCtxs
        this.descriptor = descriptor

        this.currentCtx = initialCtx ? initialCtx : this.avaliableCtxs[0]
        this.state = 'IDLE'
        this.arguments = []
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()
    }

    private _appliedHandlers = new Array<IChainHandler<PChainReq, PChainResGType>>()
    public applyHandler(handler: IChainHandler<PChainReq, PChainResGType>) {
        this._appliedHandlers.push(handler)
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

    // must be reworked hard
    private setupChain() {
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()

        const setCtxHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && req.value && this.state === 'CTX' && this.IsContextInAvaliable(req.value)) {
                return this.switchToContext(req.value as CmdArgumentContextType)
            }
            return
        })

        const setCtxSelectionHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && this.state == 'IDLE' && req.value && req.value === this.switchCtxKeyword) {
                return this.switchToContextSelection()
            }
            return
        })

        const setNextReadValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && req.value && this.state == 'IDLE') {
                const desc = this.findDescriptorByName(req.value)
                if (!desc) {
                    return
                }
                if (desc.standalone === true || desc.position !== null) {
                    return this.setNextValueSetting(req.value)
                }
            }
            return
        })

        const setFromNextReadValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && req.value && this.state == 'WAIT_NEXT_V') {
                this.setFromNextValue(req.value)
            }
            return
        })

        const setPairNameHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'DOUBLE_DASH' && req.value && this.state == 'IDLE') {
                this.transitState('PAIR')
                return this.setArgument_pairName(req.value)
            }
            return
        })

        const setPairValueHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && req.value && this.state == 'PAIR_VALUE' && this.arguments.length !== 0) {
                return this.setArgument_pairValue(req.value)
            }
            return
        })

        const setPosHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'TEXT' && req.value && this.state == 'IDLE') {
                try {
                    return this.setArgument_positional(req.value)
                } catch (e) {
                    log.error(e)
                }
            }
            return
        })

        const setStandaloneHandler = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.type == 'SINGLE_DASH' && req.value && this.state == 'IDLE') {
                this.transitState('STAND_ALONE')
                return this.setArgument_standalone(req.value)
            }
            return
        })

        for (const hndl of this._appliedHandlers) {
            this.tknParseChain.use(hndl)
        }

        this.tknParseChain.use(setCtxHandler)
        this.tknParseChain.use(setCtxSelectionHandler)
        this.tknParseChain.use(setPairValueHandler)
        this.tknParseChain.use(setPairNameHandler)

        // must be before setting positional and standalone now
        this.tknParseChain.use(setFromNextReadValueHandler)
        this.tknParseChain.use(setNextReadValueHandler)

        this.tknParseChain.use(setPosHandler)
        this.tknParseChain.use(setStandaloneHandler)
        this.tknParseChain.use(createChainFallbackHandler<PChainReq, PChainResGType>('none' as PChainResGType))
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
            read: this.arguments,
        })
    }

    private snap() {
        this.snaper.memorize({
            currentCtx: this.currentCtx,
            state: this.state,
            read: deepClone(this.arguments)
        })
    }

    public back() {
        const snap = this.snaper.back
        if (snap) {
            this.currentCtx = snap.currentCtx
            this.state = snap.state
            this.arguments = snap.read
        } else {
            throw 'Can\'t back parser state'
        }
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
        return this.arguments
    }

    get LastReadArg() {
        return this.arguments[this.arguments.length - 1]
    }

    get Descriptor() {
        return this.descriptor
    }

    get Command() {
        return this.command
    }

    get DescriptorPosArgs() {
        return this.descriptor.args.filter(arg => isArgumentDescPositional(arg))
    }

    get DescriptorPairArgs() {
        return this.descriptor.args.filter(arg => isArgumentDescPair(arg))
    }

    get ReadPositionals() {
        return this.arguments
            .filter(arg => arg.position !== undefined) // TODO
            .sort((arg1, arg2) => arg1.position! - arg2.position!)
    }

    get IsDescriptorEmpty() {
        return this.descriptor.args.length === 0
    }

    get IsDescriptorRequiredEmpty() {
        return this.descriptor.args.filter(arg => arg.required).length === 0
    }

    get NextPositionalInd() {
        return this.ReadPositionals.length + 1
    }

    get MaxPositionalInd() {
        return this.DescriptorPosArgs.length
    }

    /**
    * @returns current context if passed, otherwise current
    */
    private ctxOrCurrent(ctx?: CmdArgumentContextType): CmdArgumentContextType {
        return ctx ? ctx : this.currentCtx
    }

    private isAllArgumentRead_fromDescriptorSlice(descSlice: IUICommandDescriptor) {
        for (const argDesc of descSlice.args) {
            switch (getArgumentDescType(argDesc)) {
                case 'standalone':
                    if (!this.isArgumentStandaloneRead(argDesc.name)) {
                        return false
                    }
                    break;
                case 'positional':
                    if (!this.isArgumentPositionalRead(argDesc.position!)) {
                        return false
                    }
                    break;
                case 'pair':
                    if (!this.isArgumentNameRead(argDesc.name)) {
                        return false
                    }
                    break;
                default:
                    throw `Invalid argument descriptor type: ${JSON.stringify(argDesc)}`
            }
        }

        return true
    }

    isEveryArgumentsRead() {
        return this.isAllArgumentRead_fromDescriptorSlice(this.descriptor)
    }

    isRequiredArgumentsRead() {
        const requiredOnly = deepClone(this.descriptor)
        requiredOnly.args = requiredOnly.args.filter(arg => arg.required)
        return this.isAllArgumentRead_fromDescriptorSlice(requiredOnly)
    }

    /**
     * @returns true if argument name is read and value is empty or ''
     */
    isArgumentNameRead(input: string, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrent(ctx)
        const searchArray = this.arguments.filter(arg => arg.ctx === (ctx))
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

    isArgumentRead(input: string, ctx?: CmdArgumentContextType): boolean {
        ctx = this.ctxOrCurrent(ctx)
        const searchArray = this.arguments.filter(arg => arg.ctx === (ctx))
        for (const read of searchArray) {
            if (read.name === input) {
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

    isArgumentStandaloneRead(input: string, ctx?: CmdArgumentContextType): boolean {
        ctx = this.ctxOrCurrent(ctx)
        return this.arguments.some(arg => arg.name === input && arg.ctx === ctx && arg.standalone === true)
    }

    isArgumentPositionalRead(pos: number, ctx?: CmdArgumentContextType): boolean {
        ctx = this.ctxOrCurrent(ctx)
        return this.arguments.some(arg => arg.position === pos && arg.ctx === ctx && arg.value != '')
    }

    findDescriptorByName(name: string, ctx?: CmdArgumentContextType): IArgumentDescriptor | undefined {
        return this.descriptor.args.find(arg => arg.name === name && arg.ctx === (ctx ?? this.currentCtx))
    }

    findReadArgumentByDescritor(desc: IArgumentDescriptor): IArgumentCompiled | undefined {
        return this.arguments.find(arg => arg.name === desc.name && arg.ctx === desc.ctx)
    }

    isDescriptorExists(name: string, ctx?: CmdArgumentContextType) {
        return this.findDescriptorByName(name, ctx) !== undefined
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
        const desc = this.findDescriptorByName(input)!

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
        let ret

        if (this.nextValueSet === undefined) {
            throw `Can't set value from undefined next value setting`
        }

        if (this.nextValueSet.type === 'standalone') {
            ret = this.setArgument_standalone(this.nextValueSet.arg_name)
        } else if (this.nextValueSet.type === 'positional') {
            const pos_desc = this.findDescriptorByName(this.nextValueSet.arg_name)!
            ret = this.setArgument_positional(input, pos_desc.position!)
        } else {
            throw `Can't set value from undefined next value setting`
        }

        this.transitState('IDLE')

        return ret
    }

    private transitState(to: ParserStateType): void {
        if (to === this.state) {
            return
        }

        if (stateTransiteMap[this.state].includes(to)) {
            this.state = to
            return
        }

        throw new Error(`Can't transite from ${this.state} to ${to}. Invalid state transition`)
    }

    //

    /**
     * initiates context selection
     */
    private switchToContextSelection(): PChainResGType {
        this.transitState('CTX')

        return 'ctx-selection' as PChainResGType
    }

    /**
     * switches to new context
     */
    private switchToContext(ctx: CmdArgumentContextType): PChainResGType {
        this.currentCtx = ctx

        this.transitState('IDLE')

        return 'ctx-switch' as PChainResGType
    }

    //

    /**
     * Sets argument by descriptor and value
     * removes existing argument if its positional or pair, then pushes new
     * >>> ! toggle standalone and returns ! <<<
     */
    private __set_argument(desc: IArgumentDescriptor, value: string): PChainResGType {
        const existing = this.findReadArgumentByDescritor(desc)
        const argType = getArgumentDescType(desc)
        if (existing) {
            switch (argType) {
                case 'positional':
                    this.removeArgumentByPos(existing.position!, existing.ctx)
                    break
                case 'standalone':
                    return this.removeArgumentStandalone(existing.name, existing.ctx)
                case 'pair':
                    this.removeArgumentByPos(existing.position!, existing.ctx)
                    break
            }
        }
        this.arguments.push(useDescriptorCreateArgument(desc, value))
        const ret = argType ===
            'standalone' ? 'set-standalone' :
                argType === 'positional' ? 'set-positional' :
                    argType === 'pair' ? 'set-pair-name' :
                        'none'
        return ret as PChainResGType
    }

    /**
     * Sets argument by descriptor and value to pair argument only
     */
    private __set_argument_value(desc: IArgumentDescriptor, value: string): PChainResGType {
        const existing = this.findReadArgumentByDescritor(desc)
        if (existing) {
            if (!existing.isPair) {
                throw `Argument is not pair`
            }
            existing.value = value
            return 'set-pair-value' as PChainResGType
        }
        return 'none' as PChainResGType
    }

    //

    /**
     * creates entry for positional
     */
    private setArgument_positional(arg_value: string, pos?: number): PChainResGType {
        const maxPos = this.MaxPositionalInd
        pos = pos ?? this.NextPositionalInd
        if (pos > maxPos) {
            throw `Position exceeded: max: ${maxPos}, passed: ${pos}. `
        }
        const desc = this.descriptor.args.find(arg => arg.position === pos && arg.ctx === this.currentCtx)
        if (!desc) {
            throw `Cannot find descriptor for positional: ${pos}`
        }
        if (!isArgumentDescPositional(desc)) {
            throw `Argument descriptor is not positional: ${pos}`
        }
        this.__set_argument(desc, arg_value)

        this.transitState('IDLE')
        return 'set-positional' as PChainResGType
    }

    /**
     * creates entry for standalone
     * NOW ITS USE TOGGLE LOGIC
     */
    private setArgument_standalone(arg_name: string): PChainResGType {
        const desc = this.findDescriptorByName(arg_name)!
        if (!isArgumentDescStandalone(desc)) {
            throw `Argument descriptor is not standalone: ${arg_name}`
        }

        return this.__set_argument(desc, arg_name)
    }

    /**
     * creates entry for pair and set its name
     */
    private setArgument_pairName(arg_name: string): PChainResGType {
        const desc = this.findDescriptorByName(arg_name)!
        if (!isArgumentDescPair(desc)) {
            throw `Argument descriptor is not pair: ${arg_name}`
        }
        this.__set_argument(desc, arg_name)

        this.transitState('PAIR_VALUE')

        return 'set-pair-name' as PChainResGType
    }

    /**
    * set value to pair of last read pair name
    */
    private setArgument_pairValue(arg_value: string): PChainResGType {
        if (this.LastReadArg.value != '') {
            throw `Pair value already set`
        }
        const desc = this.findDescriptorByName(this.LastReadArg.name)!
        this.__set_argument_value(desc, arg_value)

        this.transitState('IDLE')

        return 'set-pair-value' as PChainResGType
    }

    //

    private removeArgumentByName(name: string, fromCtx?: CmdArgumentContextType): PChainResGType {
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.arguments.length
        removeObjectByFieldsMutate(this.arguments, { name: name, ctx: fromCtx })
        return before - this.arguments.length === 1 ? 'removed-pair' as PChainResGType : 'none' as PChainResGType
    }

    private removeArgumentByPos(pos: number, fromCtx?: CmdArgumentContextType): PChainResGType {
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.arguments.length
        removeObjectByFieldsMutate(this.arguments, { position: pos, ctx: fromCtx })
        return before - this.arguments.length === 1 ? 'removed-positional' as PChainResGType : 'none' as PChainResGType
    }

    private removeArgumentStandalone(name: string, fromCtx?: CmdArgumentContextType): PChainResGType {
        fromCtx = this.ctxOrCurrent(fromCtx)
        let before = this.arguments.length
        removeObjectByFieldsMutate(this.arguments, { name: name, standalone: true, ctx: fromCtx })
        return before - this.arguments.length === 1 ? 'removed-standalone' as PChainResGType : 'none' as PChainResGType
    }

    /**
    * Parser entry point
    */
    parseNextToken(token: CBLexerToken): PChainResGType {
        this.setupChain()
        this.snap()
        return this.tknParseChain.handle(token)
    }
}

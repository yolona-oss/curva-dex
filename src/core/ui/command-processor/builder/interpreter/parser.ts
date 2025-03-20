//
// TODO add state managment more organized
//      handlers are sooo garbage its need to be refactored
//

// WTF IM DONE

import { deepClone } from "@core/utils/object"
import { IArgumentCompiled, IUICommandDescriptor } from '@core/ui/types'
import { CmdArgumentContextType, IArgumentDescriptor } from "@core/ui/types/command";
import { decodePositionalName } from "@core/ui/types/command";
import { StateSnaper } from "./state-span";
import { CBLexerToken } from "./lexer";

import log from "@core/application/logger";
import { Chain, createChainFallbackHandler, chainHandlerFactory, IChainHandler } from "@core/utils/chain";
import { removeObjectByFieldsMutate } from "@core/utils/array";
import { getArgumentDescType, isArgumentDescPair, isArgumentDescPositional, isArgumentDescStandalone, compileArgumentFromDesc } from "@core/ui/types/command/argument/descriptor-helpers";

/**
 * @see ParserStateType to get more info
 */
export type ParserStateType =
  'PAIR'        // --pair_option
| 'STAND_ALONE' // -o or -option_without_pair
| 'POSITIONAL'  // simple text
| 'ARG_CTX_SEL' // context name from avaliable
| 'PAIR_VALUE'  // value for PAIR
| 'IDLE'        // idle state, waits for pair, standalone, positional or ctx
| 'WAIT_NEXT_V' // waiting for next value setted by TODO

const stateTransiteMap: Record<ParserStateType, ParserStateType[]> = {
    'IDLE': ['ARG_CTX_SEL', 'STAND_ALONE', 'POSITIONAL', 'PAIR', 'PAIR_VALUE', 'WAIT_NEXT_V', 'IDLE'],
    'ARG_CTX_SEL': ['IDLE'],
    'PAIR_VALUE': ['IDLE'],
    'STAND_ALONE': ['IDLE'],
    'POSITIONAL': ['IDLE'],
    'PAIR': ['PAIR_VALUE'],
    'WAIT_NEXT_V': ['IDLE', 'STAND_ALONE', 'POSITIONAL', 'PAIR']
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

| 'value-validation-failed' // value validation failed

export interface ICBParserStateRaw {
    command: string
    avaliableCtxs: CmdArgumentContextType[]
    descriptor: IUICommandDescriptor
    currentCtx: CmdArgumentContextType
    state: ParserStateType
    arguments: IArgumentCompiled[]
}

export type PChainReq = {
    tkn: CBLexerToken
    desc?: IArgumentDescriptor
}

export type PChainReqValidated = {
    tkn: Required<CBLexerToken>
    desc: IArgumentDescriptor
}

interface CBParserConfig {
    command: string,
    avaliableArgCtxs: CmdArgumentContextType[],
    descriptor: IUICommandDescriptor,
    switchArgCtxKeyword: string,
    initialArgCtx?: CmdArgumentContextType
}

// SPLIT THIS CLASS
export class CBParser<PChainResGType extends ParserPerformedAction|string = ParserPerformedAction> {
    private readonly command!: string
    private readonly switchArgCtxKeyword!: string
    private readonly avaliableArgCtxs!: CmdArgumentContextType[]
    private currentArgCtx!: CmdArgumentContextType
    private readonly descriptor!: IUICommandDescriptor
    private state!: ParserStateType
    private posTickBypass = false
    private _prevState!: ParserStateType
    private arguments!: IArgumentCompiled[]

    private snaper = new StateSnaper()

    private tknParseChain: Chain<PChainReq, PChainResGType>

    constructor(config: CBParserConfig) {
        log.trace(`Parser created for command: ${config.command}\nDescriptor: ${JSON.stringify(config.descriptor, null, 4)}`)
        this.setupChain()

        this.switchArgCtxKeyword = config.switchArgCtxKeyword
        this.snaper = new StateSnaper()
        this.command = config.command
        config.avaliableArgCtxs.forEach(ctx => this.validateContext(ctx))
        this.avaliableArgCtxs = config.avaliableArgCtxs

        config.descriptor.args.forEach(v => {
            if (v.name.trim() == '') {
                throw `Descriptor Argument name can't be empty`
            }
        })
        this.descriptor = config.descriptor

        this.currentArgCtx = config.initialArgCtx ? config.initialArgCtx : this.avaliableArgCtxs[0]
        this.state = 'IDLE'
        this._prevState = this.state
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

    private waitNextBuf?: { type: 'standalone'|'positional'|'pair', value: string }
    get NextValueSetType() {
        return this.waitNextBuf?.type
    }
    get NextValueSetValue() {
        return this.waitNextBuf?.value
    }

    // must be reworked hard
    private setupChain() {
        this.tknParseChain = new Chain<PChainReq, PChainResGType>()

        const switchArgCtx = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            const { tkn } = req
            if (
                this.state === 'ARG_CTX_SEL' &&
                    tkn.type == 'TEXT' &&
                    tkn.value &&
                    this.IsContextInAvaliable(tkn.value)
            ) {
                this.currentArgCtx = tkn.value as CmdArgumentContextType
                this.transitState('IDLE')
                return 'ctx-switch' as PChainResGType
            }
            return
        })

        const switchToArgCtxSelection = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            const { tkn } = req
            if (
                this.state == 'IDLE' &&
                    tkn.type == 'TEXT' &&
                    tkn.value &&
                    tkn.value === this.switchArgCtxKeyword
            ) {
                this.transitState('ARG_CTX_SEL')
                return 'ctx-selection' as PChainResGType
            }
            return
        })

        const validateRequest = chainHandlerFactory<PChainReq, PChainResGType>((req) => {
            if (req.tkn.value === undefined || req.tkn.value === null) {
                return 'none' as PChainResGType
            }

            let desired_name
            if (this.state === 'PAIR_VALUE') {
                desired_name = this.arguments[this.arguments.length - 1].name
            } else if (this.state == 'WAIT_NEXT_V') {
                desired_name = this.waitNextBuf!.value
            } else if (req.tkn.type == 'DOUBLE_DASH' || req.tkn.type == 'SINGLE_DASH') {
                desired_name = req.tkn.value
            }
            let desc = this.findDescriptorByName(desired_name ?? '')

            // preserve positional without passing its name before
            let posPreserved = false
            if (!desc && !(req.tkn.type == 'DOUBLE_DASH' || req.tkn.type == 'SINGLE_DASH')) {
                if (this.NextPositionalInd <= this.MaxPositionalInd) {
                    posPreserved = true
                    desc = this.descriptor.args.find(arg => arg.position === this.NextPositionalInd)
                }
            }

            if (!desc) {
                console.log(`Descriptor for ${desired_name ?? `positional(${this.NextPositionalInd})`} not found`)
                return 'none' as PChainResGType
            }

            this.posTickBypass = posPreserved
            req.desc = desc

            return
        })

        const setWaitNextBuf = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req
            if (this.state == 'IDLE') {
                const type = getArgumentDescType(desc)
                this.waitNextBuf = {
                    type,
                    value: tkn.value
                }
                this.transitState('WAIT_NEXT_V')

                switch (type) {
                    case 'positional':
                        if (!this.posTickBypass) {
                            console.log(`Skipping to next tick for ${tkn.value}`)
                            this.posTickBypass = false
                            return 'wait-next-inited' as PChainResGType
                        }
                        break
                    case 'pair':
                        // ?? its possible ??
                        if (tkn.type !== 'DOUBLE_DASH') {
                            log.debug(`DOUBLE_DASH token expected for descriptor but got ${tkn.type}`)
                            this.state = this._prevState
                        }
                        break
                    case 'standalone':
                        break
                }
            }
            return
        })

        const transitByBuf = chainHandlerFactory<PChainReqValidated, PChainResGType>(() => {
            if (this.state == 'WAIT_NEXT_V') {
                if (this.waitNextBuf === undefined) {
                    throw `Can't set value from undefined next value setting`
                }

                console.log(this.waitNextBuf)
                if (this.waitNextBuf.type === 'standalone') {
                    this.transitState('STAND_ALONE')
                } else if (this.waitNextBuf.type === 'positional') {
                    this.transitState('POSITIONAL')
                } else if (this.waitNextBuf.type === 'pair') {
                    this.transitState('PAIR')
                } else {
                    throw `Can't set value from undefined next value setting`
                }
            }
            return
        })

        const expectUniqExistance = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req

            if (this.state === 'STAND_ALONE') {
                removeObjectByFieldsMutate(this.arguments, { name: tkn.value, standalone: true, ctx: this.currentArgCtx })
            } else if (this.state === 'POSITIONAL') {
                const { position } = decodePositionalName(tkn.value)
                removeObjectByFieldsMutate(this.arguments, { position, ctx: this.currentArgCtx })
            } else if (this.state === 'PAIR') {
                removeObjectByFieldsMutate(this.arguments, { name: tkn.value, ctx: this.currentArgCtx })
            }
        })

        const setPairName = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req
            if (this.state === 'PAIR') {
                if (!isArgumentDescPair(desc)) {
                    throw `Argument descriptor is not pair: ${tkn.value}`
                }
                this.arguments.push(compileArgumentFromDesc(desc, ''))

                this.transitState('PAIR_VALUE')
                return 'set-pair-name' as PChainResGType
            }
            return
        })

        const validateArgumentValue = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req
            if (
                this.state === 'STAND_ALONE' ||
                    this.state === 'POSITIONAL' ||
                    this.state === 'PAIR_VALUE'
            ) {
                if (!desc.validator(tkn.value)) {
                    return 'value-validation-failed' as PChainResGType
                }
            }
            return
        })

        const setPairValue = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn } = req
            if (
                tkn.type == 'TEXT' &&
                    this.state == 'PAIR_VALUE' &&
                    this.arguments.length !== 0
            ) {
                if (this.LastReadArg.value != '') {
                    throw `Pair value already set`
                }
                this.LastReadArg.value = tkn.value

                this.transitState('IDLE')

                return 'set-pair-value' as PChainResGType
            }
            return
        })

        const setPositional = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req
            if (this.state == 'POSITIONAL') {
                const maxPos = this.MaxPositionalInd
                let pos = this.NextPositionalInd

                if (!isArgumentDescPositional(desc)) {
                    throw `Argument descriptor is not positional: ${pos}`
                }
                if (pos > maxPos) {
                    throw `Position exceeded: max: ${maxPos}, passed: ${pos}. `
                }
                this.arguments.push(compileArgumentFromDesc(desc, tkn.value))

                this.transitState('IDLE')
                return 'set-positional' as PChainResGType
            }
            return
        })

        const setStandalone = chainHandlerFactory<PChainReqValidated, PChainResGType>((req) => {
            const { tkn, desc } = req
            if (this.state == 'STAND_ALONE') {
                if (!isArgumentDescStandalone(desc)) {
                    throw `Argument descriptor is not standalone: ${tkn.value}`
                }
                if (desc.validator(tkn.value)) {
                    this.arguments.push(compileArgumentFromDesc(desc, tkn.value))
                } else {
                    this.back()
                }
            }
            return
        })

        // custom handlers phase
        for (const hndl of this._appliedHandlers) {
            this.tknParseChain.use(hndl)
        }

        // change arg ctx phase
        this.tknParseChain.use(switchToArgCtxSelection)
        this.tknParseChain.use(switchArgCtx)

        // applying and transforming needed data phace
        this.tknParseChain.use(validateRequest)
        this.tknParseChain.use(setWaitNextBuf)
        this.tknParseChain.use(transitByBuf)

        // applying data to arguments
        this.tknParseChain.use(expectUniqExistance)
        this.tknParseChain.use(setPairName)
        this.tknParseChain.use(validateArgumentValue)
        this.tknParseChain.use(setPairValue)
        this.tknParseChain.use(setPositional)
        this.tknParseChain.use(setStandalone)

        // fallback
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
            avaliableCtxs: this.avaliableArgCtxs,
            descriptor: this.descriptor,
            currentCtx: this.currentArgCtx,
            state: this.state,
            arguments: this.arguments,
        })
    }

    private snap() {
        this.snaper.memorize({
            currentCtx: this.currentArgCtx,
            state: this.state,
            _prevState: this._prevState,
            args: deepClone(this.arguments),
            waitNextBuf: deepClone(this.waitNextBuf),
        })
    }

    public back() {
        // TODO its need to back twice on wait-next-inited resolved from chain handler cause of tick skip
        const snap = this.snaper.back
        if (snap) {
            this.currentArgCtx = snap.currentCtx
            this.state = snap.state
            this.arguments = snap.args
            this._prevState = snap._prevState
            this.waitNextBuf = snap.waitNextBuf
        } else {
            throw 'Can\'t back parser state'
        }
    }

    //region Getters

    get State() {
        return this.state
    }

    get CurrentContext() {
        return this.currentArgCtx
    }

    get AvaliableContexts() {
        return this.avaliableArgCtxs
    }

    IsContextInAvaliable(ctx: string) {
        return this.avaliableArgCtxs.includes(ctx as CmdArgumentContextType)
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
        return ctx ? ctx : this.currentArgCtx
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
                    throw `Invalid argument descriptor type: ${JSON.stringify(argDesc, null, 2)}`
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
        return this.descriptor.args.find(arg => arg.name === name && arg.ctx === (ctx ?? this.currentArgCtx))
    }

    findReadArgumentByDescritor(desc: IArgumentDescriptor): IArgumentCompiled | undefined {
        return this.arguments.find(arg => arg.name === desc.name && arg.ctx === desc.ctx)
    }

    isDescriptorExists(name: string, ctx?: CmdArgumentContextType) {
        return this.findDescriptorByName(name, ctx) !== undefined
    }

    /**
     * @description Transits parser state by transit map and autocleans state resources
     */
    private transitState(to: ParserStateType): void {
        console.log(`Transiting from ${this.state} to ${to}`)
        if (to === this.state) {
            return
        }

        if (stateTransiteMap[this.state].includes(to)) {
            this._prevState = this.state
            this.state = to

            if (this._prevState == 'WAIT_NEXT_V') {
                this.waitNextBuf = undefined
            }

            return
        }

        throw new Error(`Can't transite from ${this.state} to ${to}. Invalid state transition`)
    }

    /**
    * @description Parser entry point
    */
    parseNextToken(tkn: CBLexerToken): PChainResGType {
        this.setupChain()
        this.snap()
        return this.tknParseChain.handle({tkn})
    }
}

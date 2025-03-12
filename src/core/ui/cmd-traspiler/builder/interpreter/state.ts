import { deepClone } from "@core/utils/object"
import { ICompiledReadArg, ICommandDescriptor } from "./../types"
import { Stack } from "@core/utils/struct/stack"
import { CmdArgumentContextType } from "@core/ui/types/command";

type InterpreteTokenType = "name" | "value" | "ctx"

export interface ICBStateRaw {
    command: string
    avaliableCtxs: CmdArgumentContextType[]
    descriptor: ICommandDescriptor
    currentCtx: CmdArgumentContextType
    waitingFor: InterpreteTokenType
    read: ICompiledReadArg[]
}

class StateSnap {
    constructor(
        public readonly currentCtx: CmdArgumentContextType,
        public readonly waitingFor: InterpreteTokenType,
        public readonly read: ICompiledReadArg[]
    ) {}
}

class StateSnaper {
    private snaps: Stack<StateSnap>

    constructor(
        private maxSnaps = 15,
        private batchClean = 5
    ) {
        this.snaps = new Stack(maxSnaps)
        if (batchClean > maxSnaps) {
            throw `StateSnaper:: BatchClean must be less than maxSnaps`
        }
    }

    memorize(snap: StateSnap) {
        this.snaps.push(snap)
        if (this.snaps.size() > this.maxSnaps) {
            this.snaps.pop(this.batchClean)
        }
    }

    get previous() {
        return this.snaps.pop()
    }

    get latest() {
        return this.snaps.peek()
    }
}

export class CBState {
    private command!: string
    private avaliableCtxs!: CmdArgumentContextType[]
    private descriptor!: ICommandDescriptor
    private currentCtx!: CmdArgumentContextType
    private waitingFor!: InterpreteTokenType
    private read!: ICompiledReadArg[]

    private snaper = new StateSnaper()

    constructor(
        command: string,
        avalibleCtxs: CmdArgumentContextType[],
        descriptor: ICommandDescriptor,
        initialCtx?: CmdArgumentContextType
    ) {
        this.reset(command, avalibleCtxs, descriptor, initialCtx)
    }

    private get toSnap(): StateSnap {
        return {
            currentCtx: this.currentCtx,
            waitingFor: this.waitingFor,
            read: deepClone(this.read)
        }
    }

    private snap() {
        // to be implemented. now not needed
        //this.stateSnapKeeper.memorize(this.toSnap)
    }

    get WaitingFor() {
        return this.waitingFor
    }

    get CurrentContext() {
        return this.currentCtx
    }

    get AvaliableContexts() {
        return this.avaliableCtxs
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

    private ctxOrCurrentCtx(ctx?: CmdArgumentContextType): CmdArgumentContextType {
        return ctx ? ctx : this.currentCtx
    }

    reset(cmd: string, avaliableCtxs: CmdArgumentContextType[], descriptor: ICommandDescriptor, initialCtx?: CmdArgumentContextType) {
        this.snaper = new StateSnaper()
        this.command = cmd
        this.avaliableCtxs = avaliableCtxs
        this.descriptor = descriptor

        this.currentCtx = initialCtx ? initialCtx : this.avaliableCtxs[0]
        this.waitingFor = 'name'
        this.read = []
    }

    toState(): ICBStateRaw {
        return {
            command: this.command,
            avaliableCtxs: this.avaliableCtxs,
            descriptor: this.descriptor,
            currentCtx: this.currentCtx,
            waitingFor: this.waitingFor,
            read: this.read,
        }
    }

    private isReadFromDescriptor(desc: ICommandDescriptor) {
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
            if (read.name === input) {
                return true
            } else if (read.name.startsWith('positional-')) {
                const { name } = this.decodePositionalName(read.name)
                if (name === input) {
                    return true
                }
            }
        }
        return false
    }

    isPosRead(pos: number, ctx?: CmdArgumentContextType) {
        ctx = this.ctxOrCurrentCtx(ctx)
        return this.read.some(arg => arg.position === pos && arg.ctx === ctx)
    }

    private encodePositionalName(name: string, position: number) {
        return `positional-${position}-${name}`
    }

    private decodePositionalName(input: string) {
        const constSkip = 'positional-'.length
        const position = parseInt(input.slice(constSkip).slice(0, input.indexOf('-')))
        const name = String(input.slice(input.indexOf('-', constSkip) + 1))

        return {
            position,
            name
        }
    }

    findDescriptor(name: string, ctx?: CmdArgumentContextType) {
        return this.descriptor.args.find(arg => arg.name === name && arg.ctx === (ctx ?? this.currentCtx))
    }

    transitToContextSelection() {
        this.snap()
        this.waitingFor = 'ctx'
    }

    forseTransitToContext(ctx: CmdArgumentContextType) {
        this.snap()
        if (!this.avaliableCtxs.includes(ctx)) {
            throw `Cannot transit to context: ${ctx}`
        }
        this.currentCtx = ctx
        this.waitingFor = 'name'
    }

    overrideCurrentCtx(ctx: CmdArgumentContextType) {
        this.snap()
        this.currentCtx = ctx
    }

    setPositional(input: string, pos?: number) {
        this.snap()
        if (this.waitingFor != 'name') {
            throw 'On setPositional Unexpected waitingFor: ' + this.waitingFor
        }

        pos = pos ?? this.ReadPositionals.length + 1

        const desc = this.descriptor.args.find(arg => arg.position === pos && arg.ctx === this.currentCtx)
        if (!desc) {
            const maxPos = this.descriptor.args.filter(arg => arg.position && arg.ctx == this.currentCtx).length
            throw `Cannot find descriptor for positional argument. Position exceeded: max: ${maxPos}, passed: ${pos}. `
        }
        this.read.push({
            name: this.encodePositionalName(desc.name, pos),
            value: input,
            position: pos,
            ctx: this.currentCtx
        })
    }

    setName(input: string) {
        this.snap()
        if (this.waitingFor != 'name') {
            throw 'On setName Unexpected waitingFor: ' + this.waitingFor
        }

        this.removePairRead(input)

        const desc = this.findDescriptor(input)!
        this.read.push({
            name: input,
            value: '',
            position: desc.position,
            ctx: desc.ctx
        })

        this.waitingFor = 'value'
    }

    setValue(input: string) {
        this.snap()
        if (this.waitingFor != 'value') {
            throw 'Unexpected waitingFor: ' + this.waitingFor
        }
        if (this.read.length === 0) {
            throw 'Unexpected empty read'
        }

        this.read[this.read.length - 1].value = input
        this.waitingFor = 'name'
    }

    removePairRead(input: string, fromCtx?: CmdArgumentContextType) {
        this.snap()
        fromCtx = this.ctxOrCurrentCtx(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.name !== input && arg.ctx !== fromCtx)
        return {
            removed: before - this.read.length
        }
    }

    removePosRead(pos: number, fromCtx?: CmdArgumentContextType) {
        this.snap()
        fromCtx = this.ctxOrCurrentCtx(fromCtx)
        let before = this.read.length
        this.read = this.read.filter(arg => arg.position !== pos && arg.ctx !== fromCtx)
        return {
            removed: before - this.read.length
        }
    }
}

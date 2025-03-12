import { ICommandDescriptor, } from "./types"
import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"
import { CBDescriptorCompiler } from "./desc-compiler"
import { CHComposer } from "./../ch-composer"
import { CBInterpreter } from "./interpreter"
import { Makaper } from "./makaper"
import { IBaseMarkup } from "../types/markup"
import { CBState } from "./interpreter"
import { CmdArgumentContextType } from "@core/ui/types/command";
import { EvaluationResult } from "./ev-result"
import { unique } from "@core/utils/array"
import { anyToString } from "@core/utils/misc"
import { InterpreterMode } from "./interpreter/interpreter"

// TODO mark readed args with * start line marker to make it easier to read
export class CommandBuilder {
    private usersBuild: Map<string, CBInterpreter> = new Map()

    constructor() { }

    static selectReadingContexts<UICtx extends BaseUIContext>(command: string, userId: string, chComposer: CHComposer<UICtx>): CmdArgumentContextType[] {
        const isService = chComposer.isService(command)
        const isActive = chComposer.isServiceActive(userId, command)

        return isService ?
            isActive ?
                ['message'] :
                ['params', 'config'] :
            ['args']
    }

    isUserOnBuild(userId: string) {
        if (this.usersBuild.has(userId)) {
            return true
        }
        return false
    }

    private stopBuild(userId: string) {
        this.usersBuild.delete(userId)
    }

    handle(userId: string, input: string): EvaluationResult {
        const interpreter = this.usersBuild.get(userId)
        if (!interpreter) {
            throw `User "${userId}" not on build`
        }
        const res = interpreter.step(input)
        if (res.Done) {
            this.stopBuild(userId)
        }
        return res
    }

    startBuild(userId: string, command: string, desc: ICommandDescriptor, contexts: CmdArgumentContextType[], mode?: InterpreterMode): IBaseMarkup {
        if (this.usersBuild.has(userId)) {
            throw "User already has active build."
        }

        const uniqCtxs = unique(contexts)
        if (uniqCtxs.length === 0) {
            throw "No avalible contexts."
        }

        if (desc.args.length === 0) {
            throw "No arguments in descriptor. Nothing to build."
        }

        // NOTE: ok?
        const initialCtx = uniqCtxs[0]

        const state = new CBState(command, uniqCtxs, desc, initialCtx)
        const interpreter = new CBInterpreter(state, mode)
        this.usersBuild.set(userId, interpreter)

        return Makaper.__tmpMarkup(state)
    }

    public async chipsCompile<UICtx extends BaseUIContext>(
        userId: string,
        command: string,
        input: string,
        ctx: UICtx,
        chComposer: CHComposer<UICtx>
    ): Promise<EvaluationResult> {
        const desc_compiler = new CBDescriptorCompiler<UICtx>()
        const descriptor = await desc_compiler.compile(command, userId, chComposer, ctx)

        const argContexts = CommandBuilder.selectReadingContexts(command, userId, chComposer)
        const cbstate = new CBState(command, argContexts, descriptor, 'args')
        const interpreter = new CBInterpreter(cbstate, 'inclusive')

        try {
            const compiled = interpreter.step(input)
            return compiled
        } catch(e) {
            throw `${UiUnicodeSymbols.cross} Build by chips failed.\n
-- ${UiUnicodeSymbols.magnifierGlass} Input: ${UiUnicodeSymbols.arrowRight} "${input}".\n
-- ${UiUnicodeSymbols.magnifierGlass} Error: ${UiUnicodeSymbols.arrowRight} "${anyToString(e) || "Unknown error"}"`
        }
    }
}


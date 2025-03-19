import { IUICommandDescriptor } from "@core/ui/types"
import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"
import { CBDescriptorCompiler } from "./desc-compiler"
import { CmdDispatcher } from "./../dispatcher"
import { CBInterpreter } from "./interpreter"
import { Makaper } from "./makaper"
import { IBaseMarkup } from "../types/markup"
import { CBParser } from "./interpreter/parser"
import { CmdArgumentContextType } from "@core/ui/types/command";
import { EvaluationResult } from "./ev-result"
import { unique } from "@core/utils/array"
import { anyToString } from "@core/utils/misc"
import { InterpreterMode } from "./interpreter/interpreter"
import { BuilderActionSigns } from "./default-callbacks"
import log from "@core/application/logger"

// TODO mark readed args with * start line marker to make it easier to read
export class CommandBuilder {
    private usersBuild: Map<string, CBInterpreter> = new Map()

    constructor() { }

    static selectReadingContexts<UICtx extends BaseUIContext>(command: string, userId: string, dispatcher: CmdDispatcher<UICtx>): CmdArgumentContextType[] {
        const isService = dispatcher.isService(command)
        const isActive = dispatcher.isServiceActive(userId, command)

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

    startBuild(userId: string, command: string, desc: IUICommandDescriptor, contexts: CmdArgumentContextType[], mode?: InterpreterMode): IBaseMarkup {
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

        const state = new CBParser(command, uniqCtxs, desc, BuilderActionSigns.switchCtx, initialCtx)
        const interpreter = new CBInterpreter(state, mode)
        this.usersBuild.set(userId, interpreter)

        return Makaper.__tmpMarkup(state)
    }

    /**
     * Compile command non-crendary
     */
    public async compile<UICtx extends BaseUIContext>(
        userId: string,
        command: string,
        input: string,
        ctx: UICtx,
        dispatcher: CmdDispatcher<UICtx>
    ): Promise<EvaluationResult> {
        log.trace(`CommandBuilder: Starting non-crendary compilation for command: ${command}`)
        const desc_compiler = new CBDescriptorCompiler<UICtx>()
        const descriptor = await desc_compiler.compile(command, userId, dispatcher, ctx)

        const argContexts = CommandBuilder.selectReadingContexts(command, userId, dispatcher)
        const parser = new CBParser(command, argContexts, descriptor, BuilderActionSigns.switchCtx, 'args')
        const interpreter = new CBInterpreter(parser, 'non-crendary')

        try {
            const compiled = interpreter.step(input)
            return compiled
        } catch(e) {
            throw `${UiUnicodeSymbols.cross} Non crendary compilation failed.\n
-- ${UiUnicodeSymbols.magnifierGlass} Input: ${UiUnicodeSymbols.arrowRight} "${input}".\n
-- ${UiUnicodeSymbols.magnifierGlass} Error: ${UiUnicodeSymbols.arrowRight} "${anyToString(e) || "Unknown error"}"`
        }
    }
}


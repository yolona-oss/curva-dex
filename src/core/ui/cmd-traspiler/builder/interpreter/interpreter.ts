import { UiUnicodeSymbols } from "@core/ui";
import { DefaultBuilderCallbacks } from "../../constants";
import { CBState } from "./state";
import { EvaluationResult } from "./../ev-result";
import { ICommandCompiled } from '@core/ui/types/command';
import { CmdArgumentContextType } from "@core/ui/types/command";
import { anyToString } from "@core/utils/misc";

import { AbstractState, AbstractCtx } from "@core/types/state";
import log from '@logger';

/**
 * @param comprehensive - every argument must be processed
 * @param required - parse will be done on all required arguments read
 * @param inclusive - mode to read ready compiled arguments.
 */
export type InterpreterMode = "comprehensive" | "required" | "inclusive"

/**
 * @param {CBState} state - interpreter state manager and data manipulator
 * @param {InterpreterMode} mode [mode="required"] - setup interpritation completion triger
 */
export class CBInterpreter extends AbstractCtx<BaseInterpreterComponent> {
    constructor(
        state: CBState,
        mode: InterpreterMode = "required"
    ) {
        super(new BaseInterpreterComponent(state))
        log.trace(`Interpreter mode: ${mode}`)
        log.trace(`Initial context: ${state.CurrentContext}`)
        switch (mode) {
            case "comprehensive":
                this.transitionTo(new InterpreterModeComprehensive(state))
                break
            case "required":
                this.transitionTo(new InterpreterModeRequired(state))
                break;
            case "inclusive":
                this.transitionTo(new InterpreterModeInclusive(state))
                break;
        }
    }

    step(input: string): EvaluationResult {
        return this._ctx_state.step(input)
    }
}

/**
 * Base component that contain main interpritation logic for command builder
 */
class BaseInterpreterComponent extends AbstractState<CBInterpreter> {
    constructor(
        protected state: CBState
    ) {
        super()
    }

    step(input: string): EvaluationResult {
        log.trace(`#--Interpreter-- Input: "${input}" ----#`)
        if (this.state.WaitingFor === 'ctx') {
            return this.switchReadingContext(input)
        }

        if (this.isDefaultCb(input)) {
            return this.handleDefaultCb(input)
        }

        return this.parsePairInput(input)
    }

    
    protected compile(): ICommandCompiled {
        return {
            command: this.state.BuildingCommand,
            args: this.state.ReadArgs
        }
    }

    protected parsePairInput(input: string) {
        const readType = this.state.WaitingFor

        if (readType === 'name') {
            return this.readPairName(input)
        } else if (readType === 'value') {
            return this.readPairValue(input)
        } else {
            throw 'Unexpected waitingFor: ' + readType
        }
    }

    protected readPairName(input: string) {
        const inputDescriptor = this.state.findDescriptor(input)

        log.trace(`--Interpreter-- Read argument: "${input}"`)
        if (this.state.isNameRead(input, this.state.CurrentContext)) {
            const { removed } = this.state.removePairRead(input, this.state.CurrentContext)
            if (removed != 1) {
                throw `Cannot remov duplicated on re-read read argument`
            }
            this.state.setName(input)

            log.trace(`--Interpreter-- Re-read argument: "${input}"`)
            return new EvaluationResult(
                this.state,
                `Resetting argument...`,
            )
        }

        if (!inputDescriptor) {
            log.trace(`--Interpreter-- Setting positional: "${input}"`)
            this.state.setPositional(input)
            return new EvaluationResult(
                this.state,
                `Setted positional argument ${UiUnicodeSymbols.arrowRight} "${input}".`,
                {addTo: "end"}
            )
        }

        log.trace(`--Interpreter-- Setting named: "${input}"`)
        this.state.setName(input)

        return new EvaluationResult(
            this.state,
            `Select value to argument ${UiUnicodeSymbols.arrowRight} "${input}": `,
            { addTo: 'end' }
        )
    }

    protected readPairValue(input: string) {
        log.trace(`--Interpreter-- Setting value: "${input}"`)
        this.state.setValue(input)

        return new EvaluationResult(
            this.state,
            `Select value to argument ${UiUnicodeSymbols.arrowRight} "${this.state.ReadArgs[this.state.ReadArgs.length - 1].name}": `,
            { addTo: 'end' }
        )
    }

    protected switchReadingContext(input: string) {
        try {
            this.state.forseTransitToContext(input as CmdArgumentContextType)
        } catch(e: any) {
            return new EvaluationResult(
                this.state,
                [
                    `${UiUnicodeSymbols.error} Unknown reading context: ${UiUnicodeSymbols.arrowRight} "${input}"`,
                    ` -- Avalible contexts: ${this.state.AvaliableContexts.map(ctx => ` ${UiUnicodeSymbols.arrowRight} ${ctx}`)}.`,
                    `${UiUnicodeSymbols.gear} Aborting...`
                ],
                {done: true, error: anyToString(e)}
            )
        }
        return new EvaluationResult(
            this.state,
            ` -- ${UiUnicodeSymbols.success} Ctx switched to: "${input}".`,
            {addTo: "end"}
        )
    }

    protected isDefaultCb(input: string) {
        return [
            DefaultBuilderCallbacks.cancel,
            DefaultBuilderCallbacks.execute,
            DefaultBuilderCallbacks.switchCtx
        ].includes(input)
    }

    protected handleDefaultCb(input: string) {
        if (input === DefaultBuilderCallbacks.cancel) {
            return new EvaluationResult(
                this.state,
                `\n${UiUnicodeSymbols.cross} Build canceled by user`,
                { done: true }
            )
        } else if (input === DefaultBuilderCallbacks.execute) {
            const comiled = this.compile()
            return new EvaluationResult(
                this.state,
                `${UiUnicodeSymbols.success} Build success`// : `${UiUnicodeSymbols.error} Build failed`
                , { compiled: comiled }
            )
        } else if (input === DefaultBuilderCallbacks.switchCtx) {
            this.state.transitToContextSelection()
            return new EvaluationResult(
                this.state,
                [
                    `Switch to reading context.`,
                    ` -- Current context: ${UiUnicodeSymbols.arrowRight} "${this.state.CurrentContext}"}`
                ], {addTo: "end"}
            )
        } else {
            throw `${UiUnicodeSymbols.error} Unknown default callback: ${UiUnicodeSymbols.arrowRight} "${input}"`
        }
    }
}

/**
* Will runs until all arguments in descripter are read
*/
class InterpreterModeComprehensive extends BaseInterpreterComponent {
    step(input: string) {
        const res = super.step(input)

        if (this.state.isEveryRead()) {
            const compiled = this.compile()
            return new EvaluationResult(
                this.state,
                `Building command`,
                {compiled: compiled, addTo: "end"}
            )
        }

        return res
    }
}

/**
* Will runs until all required arguments in descripter are read
*/
class InterpreterModeRequired extends BaseInterpreterComponent {
    step(input: string) {
        console.log(`----PRE----------`)
        console.log(this.state.ReadArgs)
        console.log(`----PRE-END------`)
        const res = super.step(input)

        if (this.state.isRequiredRead()) {
            const compiled = this.compile()
            console.log(`-----DONE----------------------`)
            console.log(this.state.ReadArgs)
            console.log(`-------------------------------`)
            return new EvaluationResult(
                this.state,
                `Building command`,
                {compiled: compiled, addTo: "end"}
            )
        }

        console.log(`----POST---------`)
        console.log(this.state.ReadArgs)
        console.log(`----POST-END-----`)

        return res
    }
}

/**
* Gets all argumets once then parse all of them
*/
class InterpreterModeInclusive extends BaseInterpreterComponent {
    private getChips(input: string) {
        const chips: string[] = []
        const regex = /[^\s"]+|"([^"]*)"/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(input)) !== null) {
            chips.push(match[1] ? match[1] : match[0])
        }

        if (chips.length >= 1) {
            return chips
        }

        throw `No chips found in input: "${input}"`
    }

    private parseByChips(casulaInput: string) {
        const transStep = (input: string) => super.step(input)

        const chips = this.getChips(casulaInput)
        for (const chip of chips) {
            const transRes = transStep(chip)
            if (transRes.Done) {
                break
            }
        }
    }

    step(casulaInput: string) {
        if (this.state.IsDescArgsEmpty) {
            // nothing to parse
        } else if (casulaInput.length !== 0) {
            this.parseByChips(casulaInput)
        }

        const compiled = this.compile()
        return new EvaluationResult(
            this.state,
            `Inclusive build done ${UiUnicodeSymbols.hammer}`,
            {compiled: compiled, addTo: "end"}
        )
    }
}

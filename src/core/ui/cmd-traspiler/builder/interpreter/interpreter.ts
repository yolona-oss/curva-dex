import { AbstractCtx } from "@core/types/state";
import log from '@logger';
import { CBParser } from "./parser";
import { EvaluationResult } from "./../ev-result";
import { BaseInterpreterComponent } from "./modes";

import {
    InterpreterModeComprehensive,
    InterpreterModeRequired,
    InterpreterModeNonCrendary
} from "./modes"

/**
 * @param comprehensive - every argument must be processed
 * @param required - parse will be done on all required arguments read
 * @param non-crendary - mode to read ready compiled arguments.
 */
export type InterpreterMode = "comprehensive" | "required" | "non-crendary"

const default_mode: InterpreterMode = "required"

/**
 * @param {CBState} state - interpreter state manager and data manipulator
 * @param {InterpreterMode} mode [mode="required"] - setup interpritation completion triger
 */
export class CBInterpreter extends AbstractCtx<BaseInterpreterComponent> {
    private mode: InterpreterMode

    constructor(
        private parser: CBParser,
        mode: InterpreterMode = default_mode
    ) {
        super(new BaseInterpreterComponent(parser))
        this.mode = mode
        log.trace(`Interpreter mode: ${mode}`)
        log.trace(`Initial context: ${parser.CurrentContext}`)
        switch (mode) {
            case "comprehensive":
                this.transitionTo(new InterpreterModeComprehensive(this.parser))
                break
            case "required":
                this.transitionTo(new InterpreterModeRequired(this.parser))
                break;
            case "non-crendary":
                this.transitionTo(new InterpreterModeNonCrendary(this.parser))
                break;
        }
    }

    switchTo(mode: InterpreterMode) {
        if (this.mode === mode) {
            log.debug(`On interpreter mode switch: Interpreter already in ${mode} mode`)
            return
        }

        this.transitionTo(new BaseInterpreterComponent(this.parser))
        switch (mode) {
            case "comprehensive":
                this.transitionTo(new InterpreterModeComprehensive(this.parser))
                break
            case "required":
                this.transitionTo(new InterpreterModeRequired(this.parser))
                break;
            case "non-crendary":
                this.transitionTo(new InterpreterModeNonCrendary(this.parser))
                break;
            default:
                throw `Unknown interpreter mode: ${mode}`
        }
    }

    step(input: string): EvaluationResult {
        return this.CurrentCtxStateObj.step(input)
    }
}

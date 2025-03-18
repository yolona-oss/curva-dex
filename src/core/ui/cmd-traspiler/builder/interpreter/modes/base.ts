import { Lexer } from "./../lexer";
import { UiUnicodeSymbols } from "@core/ui";
import { DefaultBuilderCallbacks } from "./../../default-callbacks";
import { ICommandCompiled } from '@core/ui/types/command';
import { AbstractState } from "@core/types/state";
import { CBInterpreter } from "../interpreter";
import { CBParser, ParserPerformedAction, PChainReq } from "../parser";
import { EvaluationResult } from "../../ev-result";
import log from "@core/application/logger";
import { chainHandlerFactory } from "@core/utils/chain";
import { CmdArgumentProxy } from "@core/ui/cmd-traspiler/arg-proxy";

type ExtendedCBChainRes = ParserPerformedAction | 'cancel' | 'cancel-op' | 'execute'

/**
 * Base component that contain main interpritation logic for command builder
 * @description Implements base incremental reading. Stop will be triggered by default callbacks "execute"
 *
 * @extends AbstractState to manage state
 */
export class BaseInterpreterComponent extends AbstractState<CBInterpreter> {
    private lexer: Lexer
    protected parser: CBParser<ExtendedCBChainRes>

    constructor(parser: CBParser) {
        super()
        this.parser = parser
        this.lexer = new Lexer()

        this.parser.applyHandler(chainHandlerFactory<PChainReq, ExtendedCBChainRes>(function(this: BaseInterpreterComponent, req) {
            log.trace(`Cancel handler: ${req.value}`)
            if (req.type == 'TEXT' && this.parser.State === 'IDLE' && req.value && req.value === DefaultBuilderCallbacks.cancelBuild) {
                return 'cancel'
            }
            return
        }, this))

        this.parser.applyHandler(chainHandlerFactory<PChainReq, ExtendedCBChainRes>(function(this: BaseInterpreterComponent, req) {
            log.trace(`Execute handler: ${req.value}`)
            if (req.type == 'TEXT' && this.parser.State === 'IDLE' && req.value && req.value === DefaultBuilderCallbacks.execute) {
                return 'execute'
            }
            return
        }, this))

        this.parser.applyHandler(chainHandlerFactory<PChainReq, ExtendedCBChainRes>(function(this: BaseInterpreterComponent, req) {
            log.trace(`Cancel op handler: ${req.value}`)
            if (req.type == 'TEXT' && req.value && req.value === DefaultBuilderCallbacks.cancelOp) {
                return 'cancel-op'
            }
            return
        }, this))
    }

    step(input: string): EvaluationResult {
        this.lexer.setInput(input)
        const token = this.lexer.getNextToken()

        if (!token) {
            return this.end()
        }

        const action = this.parser.parseNextToken(token)

        return this.processAction(action)
    }

    protected processAction(action: ExtendedCBChainRes): EvaluationResult {
        log.trace(`CBInterpreter::BaseInterpreterComponent: Action: ${action}`)

        switch (action) {
            case 'none':
                return new EvaluationResult(
                    this.parser,
                    'nothing to do',
                    { done: false }
                )

            case 'cancel': 
                return new EvaluationResult(
                    this.parser,
                    `\n${UiUnicodeSymbols.cross} Build canceled by user`,
                    { done: true, addTo: 'end' }
                )

            case 'cancel-op':
                this.parser.back()
                return new EvaluationResult(
                    this.parser,
                    `\n${UiUnicodeSymbols.cross} Operation canceled by user`,
                    { done: false, addTo: 'end' }
                )

            case 'execute':
                const compiled = this.compile()
                return new EvaluationResult(
                    this.parser,
                    `${UiUnicodeSymbols.success} Build success`
                    , { compiled: compiled, addTo: 'end' }
                )

            case 'set-pair':
                log.trace('Handling set-pair: Setting pair name and value.');
                return new EvaluationResult(
                    this.parser,
                    `Pair name and value was set.`,
                )

            case 'set-pair-name':
                log.trace('Handling set-pair-name: Setting only pair name.');
                return new EvaluationResult(
                    this.parser,
                    `Pair name was set.`
                )

            case 'set-pair-value':
                log.trace('Handling set-pair-value: Setting only pair value after pair name is set.');
                return new EvaluationResult(
                    this.parser,
                    `Pair value was set.`
                )

            case 'set-standalone':
                log.trace('Handling set-standalone: Setting standalone option.');
                return new EvaluationResult(
                    this.parser,
                    `Standalone option was set.`
                )

            case 'set-positional':
                log.trace('Handling set-positional: Setting positional argument.');
                return new EvaluationResult(
                    this.parser,
                    `Positional argument was set.`,
                )

            case 'ctx-switch':
                log.trace('Handling ctx-switch: Reading context switched to new.');
                return new EvaluationResult(
                    this.parser,
                    `Reading context switched to new.`,
                )

            case 'ctx-selection':
                log.trace('Handling ctx-selection: State switched to context selection.');
                return new EvaluationResult(
                    this.parser,
                    `Context selection started.`,
                )

            case 'removed-pair':
                log.trace('Handling removed-pair: Pair was removed.');
                return new EvaluationResult(
                    this.parser,
                    `Pair was removed.`,
                )

            case 'removed-standalone':
                log.trace('Handling removed-standalone: Standalone was removed.');
                return new EvaluationResult(
                    this.parser,
                    `Standalone was removed.`,
                )

            case 'removed-positional':
                log.trace('Handling removed-positional: Positional was removed.');
                return new EvaluationResult(
                    this.parser,
                    `Positional was removed.`,
                )

            case 'wait-next-inited':
                log.trace('Handling wait-next-inited: Waiting for next value.');
                return new EvaluationResult(
                    this.parser,
                    `Waiting for next value.`,
                )

            default:
                return new EvaluationResult(
                    this.parser,
                    'Unexpected action: ' + action,
                    { done: true, error: `Unexpected action: ${action}`, addTo: 'end' }
                )
        }
    }

    protected end() {
        log.trace(`End of input reached`)
        return new EvaluationResult(
            this.parser,
            '',
            {done: true}
        )
    }

    protected compile(): ICommandCompiled {
        log.trace(`Compiling command: ${this.parser.BuildingCommand}`)
        return {
            command: this.parser.BuildingCommand,
            proxy: new CmdArgumentProxy(this.parser.ReadArgs),
            raw: this.parser.ReadArgs
        }
    }
}

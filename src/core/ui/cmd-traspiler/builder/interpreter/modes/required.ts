import log from "@core/application/logger"
import { EvaluationResult } from "../../ev-result"
import { BaseInterpreterComponent } from "./base"

/**
* Will runs until all required arguments in descripter are read
*/
export class InterpreterModeRequired extends BaseInterpreterComponent {
    step(input: string) {
        log.trace(this.parser.Descriptor.args)
        log.trace(`-----PRE NOT DONE-----------------\n${this.parser.ReadArgs}\n-------------------------------`)
        const res = super.step(input)

        if (this.parser.isRequiredRead()) {
            const compiled = this.compile()
            log.trace(`-----DONE----------------------\n${this.parser.ReadArgs}\n-------------------------------`)
            return new EvaluationResult(
                this.parser,
                `Building command`,
                {compiled: compiled, addTo: "end"}
            )
        }

        log.trace(`-----POST NOT DONE-----------------\n${this.parser.ReadArgs}\n-------------------------------`)

        return res
    }
}

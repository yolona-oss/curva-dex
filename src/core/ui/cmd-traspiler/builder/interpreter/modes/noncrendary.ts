import { UiUnicodeSymbols } from "@core/ui/ui-unicode-symbols"
import { EvaluationResult } from "../../ev-result"
import { BaseInterpreterComponent } from "./base"
import log from "@core/application/logger"

/**
* Gets all argumets once then parse all of them
*/
export class InterpreterModeNonCrendary extends BaseInterpreterComponent {
    private getChips(input: string) {
        const chips: string[] = []
        const regex = /[^\s"]+|"([^"]*)"/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(input)) !== null) {
            chips.push(match[1] ? match[1] : match[0])
        }

        log.trace(`----------- chips: `, chips)
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
        if (this.parser.IsDescArgsEmpty) {
            log.trace(`Non-crendary mode: no args to parse, just printing`)
            // nothing to parse
        } else if (casulaInput.length !== 0) {
            this.parseByChips(casulaInput)
        }

        const compiled = this.compile()
        return new EvaluationResult(
            this.parser,
            `Inclusive build done ${UiUnicodeSymbols.hammer}`,
            {compiled: compiled, addTo: "end"}
        )
    }
}

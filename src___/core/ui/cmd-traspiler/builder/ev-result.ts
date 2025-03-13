import { Makaper } from "./makaper"
import { IBaseMarkup } from "../types/markup"
import { CBState } from "./interpreter"
import { ICommandCompiled } from "@core/ui/types/command"

export class EvaluationResult {
    private done: boolean
    private markup: IBaseMarkup
    private compiled?: ICommandCompiled
    private error?: string

    constructor(
        state: CBState,
        info: string|string[],
        config: {
            compiled?: ICommandCompiled
            done?: boolean,
            error?: string
            addTo?: "begining"|"end"
        } = {}
    ) {
        this.done = config.compiled ? true : (config.done ?? false)
        this.compiled = config.compiled
        this.error = config.error
        this.markup = Makaper.markup(state, {
            text: {
                info: info,
                addTo: config.addTo
            }
        })
    }

    get Done() {
        return this.done
    }

    get Markup() {
        return this.markup
    }

    get HasError() {
        return Boolean(this.error)
    }

    get Error() {
        return this.error ?? "unknown error"
    }

    get IsCompiled() {
        return Boolean(this.compiled)
    }

    get Result() {
        if (this.IsCompiled) {
            return this.compiled!
        } else {
            throw `Assesing to built result but there are not done`
        }
    }
}

import { Makaper } from "./makaper"
import { IBaseMarkup } from "../types/markup"
import { CBState } from "./interpreter"
import { PrimaryInvokeParams } from "../types"

export class EvaluationResult {
    private done: boolean
    private markup: IBaseMarkup
    private built?: PrimaryInvokeParams
    private error?: string

    constructor(
        state: CBState,
        info: string|string[],
        config: {
            built?: PrimaryInvokeParams
            done?: boolean,
            error?: string
            addTo?: "begining"|"end"
        } = {}
    ) {
        this.done = config.built ? true : (config.done ?? false)
        this.built = config.built
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

    get IsBuilt() {
        return Boolean(this.built)
    }

    get Result() {
        if (this.IsBuilt) {
            return this.built!
        } else {
            throw `Assesing to built result but there are not done`
        }
    }
}

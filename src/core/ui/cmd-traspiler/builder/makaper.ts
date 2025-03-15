import { UiUnicodeSymbols } from "@core/ui"
import { IArgumentCompiled } from "@core/ui/types"
import { CBParser, ICBParserStateRaw } from './interpreter/parser'
import { defaultBuilderMarkupOptions } from './default-markup'
import { IMarkupOptionType, IMarkupOption, IBaseMarkup } from "../types/markup"

// toMarkup only
interface toMarkupOptType {
    text: string,
    cb_value?: string,
    type: IMarkupOptionType,
    isRead?: boolean
}

interface IMakaperBuildOpts {
    text?: {
        overwrite?: string,
        info: string|string[],
        addTo?: "begining"|"end"
    },
    options?: {
        argName?: string
        defaultsOverwrite?: IMarkupOption[],
        defaultsAppend?: IMarkupOption[],
    }
}

export class Makaper {
    private constructor() {}

    static toMarkup(opt: toMarkupOptType): IMarkupOption {
        if (opt.cb_value === undefined) {
            opt.cb_value = opt.text
        }
        return {
            text: opt.text,
            type: opt.type,
            isRead: opt.isRead,
            callback_data: opt.cb_value
        }
    }


    static BuildingString(parserState: ICBParserStateRaw, info = "", addTo: "begining"|"end" = "begining"): string {
        const command = parserState.command
        let buildStr = `${UiUnicodeSymbols.hammer} Building "${command}"\n\nReaded:\n`

        const readArgToStr = (arg: IArgumentCompiled) => {
            switch (arg.ctx) {
                case "args":
                    // TODO positionals
                    return ` - ${UiUnicodeSymbols.hammer} <${arg.name}>: ${arg.value}`
                case "config":
                    return ` - ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "params":
                    return ` - ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "message":
                    return ` - ${UiUnicodeSymbols.mail} ${arg.name}: ${arg.value}`
            }
            //return ` - ${UiUnicodeSymbols.warning} (unkown ctx: "${arg.ctx}") ${arg.name}: ${arg.value}`
        }

        const argGroupToString = (name: string, group: IArgumentCompiled[]) => {
            let str = `\n* ${name}:`
            for (const arg of group) {
                str += '\n' + readArgToStr(arg)
            }
            return str
        }

        const args = parserState.read.filter(arg => arg.ctx === "args")
        const configs = parserState.read.filter(arg => arg.ctx === "config")
        const params = parserState.read.filter(arg => arg.ctx === "params")
        const messages = parserState.read.filter(arg => arg.ctx === "message")

        buildStr += args.length > 0 ? '\n' + argGroupToString("Arguments", args) : ''
        buildStr += configs.length > 0 ? '\n' + argGroupToString("Configs", configs) : ''
        buildStr += params.length > 0 ? '\n' + argGroupToString("Parameters", params) : ''
        buildStr += messages.length > 0 ? '\n' + argGroupToString("Messages", messages) : ''

        if (addTo === "begining") {
            buildStr = `${info}\n${buildStr}`
        } else if (addTo === "end") {
            buildStr = `${buildStr}\n\n${info}`
        }
        return buildStr
    }

    // TODO create new name or rebase it
    // mb pass BuildingString function as param to create text
    static __tmpMarkup(parser: CBParser) {
        const desc = parser.toState().descriptor
        const args = desc.args.filter(v => v.ctx === 'args')
        const msgs = desc.args.filter(v => v.ctx === 'message')
        const params = desc.args.filter(v => v.ctx === 'params')
        const configs = desc.args.filter(v => v.ctx === 'config')

        let desc_str = ""
        const stroke = (str: string, pair: string) => `${pair[0]}${str}${pair[1]}`;

        [args, msgs, params, configs].forEach(descType => {
            desc_str += descType.map(v =>
                ` - ${stroke(v.name, v.required ? "<>" : "[]")} - ${v.description ?? "No description"}`
            ).join('\n') + "\n";
        })

        const overwrite =
            `${UiUnicodeSymbols.hammer} Run CmdBuilder\n
Building command: - ${UiUnicodeSymbols.arrowRight} "${parser.BuildingCommand}".\n
 - Avalible context: ${UiUnicodeSymbols.arrowRight} ${parser.toState().avaliableCtxs.join(", ")}.\n${desc_str}`

        return Makaper.markup(parser, {
            text: {
                overwrite,
                info: "",
            },
        })
    }

    static markup(parser: CBParser, {text, options}: IMakaperBuildOpts): IBaseMarkup {
        if (!text) {
            text = {
                info: ""
            }
        }
        if (!options) {
            options = {
            }
        }

        const infoText = Array.isArray(text.info) ? text.info.join('\n') : text.info

        const descArgs = parser.toState().descriptor.args
        let markuped: IMarkupOption[] = []
        if (options.argName) {
            const arg = descArgs.find(arg => arg.name === options.argName)
            if (arg) {
                markuped = arg.pairOptions?.map(opt =>
                    this.toMarkup({
                        text: opt,
                        type: 'value'
                    })
                ) ?? []
            }
        } else {
            markuped = descArgs.filter(arg => arg.ctx === parser.CurrentContext).map(arg => 
                this.toMarkup({
                    text: arg.name,
                    type: 'name',
                    isRead: parser.isNameRead(arg.name)
                })
            )
        }

        // TODO its too not open-close 
        if (parser.State === 'CTX') {
            markuped = parser.AvaliableContexts.map(ctx => Makaper.toMarkup({text: ctx, type: "value", isRead: false}))
        }

        const mk_text = text.overwrite ?
            text.overwrite :
            this.BuildingString(parser.toState(), infoText, text.addTo)

        const created_options = [
            ...markuped,
            ...(options.defaultsOverwrite ?? defaultBuilderMarkupOptions),
            ...(options.defaultsAppend ?? [])
        ]

        return {
            text: mk_text,
            options: created_options
        }
    }
}

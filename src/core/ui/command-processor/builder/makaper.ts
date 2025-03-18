import { UiUnicodeSymbols } from "@core/ui"
import { IArgumentCompiled } from "@core/ui/types"
import { CBParser, ICBParserStateRaw } from './interpreter/parser'
import { BuilderMarkups } from './default-markup'
import { IMarkupButton, IBaseMarkup } from "../types/markup"

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

interface IMakaperBuildOpts {
    text?: {
        overwrite?: string,
        info: string|string[],
        addTo?: "begining"|"end"
    },
    options?: {
        extra_buttons?: IMarkupButton[],
    }
}

const d_text = {
    info: ""
}
const d_options = {
}

export class Makaper {
    private constructor() {}

    static toMarkup(opt: Optional<IMarkupButton, 'data'>): IMarkupButton {
        return {
            text: opt.text,
            type: opt.type,
            isRead: opt.isRead ?? false,
            data: opt.data ?? opt.text
        }
    }


    static BuildingString(state: ICBParserStateRaw, info = "", addTo: "begining"|"end" = "end"): string {
        const command = state.command
        info = info.length > 0 ? `${UiUnicodeSymbols.info} - ${info}` : ""
        let buildStr = `${UiUnicodeSymbols.hammer} Building "${command}"\n`

        const settedArgToStr = (arg: IArgumentCompiled) => {
            switch (arg.ctx) {
                case "args":
                    // TODO positionals
                    return ` - ${UiUnicodeSymbols.hammer} **${arg.name}**: ${arg.value}`
                case "config":
                    return ` - ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "params":
                    return ` - ${UiUnicodeSymbols.gear} ${arg.name}: ${arg.value}`
                case "message":
                    return ` - ${UiUnicodeSymbols.mail} ${arg.name}: ${arg.value}`
            }
        }

        const argGroupToString = (name: string, group: IArgumentCompiled[]) => {
            let str = `\n* ${name}:`
            for (const arg of group) {
                str += '\n' + settedArgToStr(arg)
            }
            return str
        }

        const args = state.read.filter(arg => arg.ctx === "args")
        const configs = state.read.filter(arg => arg.ctx === "config")
        const params = state.read.filter(arg => arg.ctx === "params")
        const messages = state.read.filter(arg => arg.ctx === "message")

        buildStr += args.length > 0 ? argGroupToString("Arguments", args) : ''
        buildStr += configs.length > 0 ? argGroupToString("Configs", configs) : ''
        buildStr += params.length > 0 ? argGroupToString("Parameters", params) : ''
        buildStr += messages.length > 0 ? argGroupToString("Messages", messages) : ''

        if (addTo === "begining") {
            buildStr = `${info}\n\n${buildStr}`
        } else if (addTo === "end") {
            buildStr = `${buildStr}\n\n${info}`
        }
        return buildStr
    }

    // TODO create new name or rebase it
    // mb pass BuildingString function as param to create text
    static __tmpMarkup(parser: CBParser) {
        const desc = parser.toRawState().descriptor
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
 - Avalible context: ${UiUnicodeSymbols.arrowRight} ${parser.toRawState().avaliableCtxs.join(", ")}.\n${desc_str}`

        return Makaper.markup(parser, {
            text: {
                overwrite,
                info: "",
            },
        })
    }

    static markup(parser: CBParser, {text, options}: IMakaperBuildOpts): IBaseMarkup {
        text = {...d_text, ...text}
        options = {...d_options, ...options}

        const infoText = Array.isArray(text.info) ? text.info.join('\n') : text.info

        let auxButtons = BuilderMarkups.default
        let byStateButtons: IMarkupButton[] = []
        
        // BIG BUTTY CONDITION HERE
        if (parser.State === 'PAIR_VALUE') {// show pair options
            const desc = parser.findDescriptor(parser.LastReadArg.name)!
            byStateButtons = desc.pairOptions?.map(opt =>
                this.toMarkup({
                    text: `${opt}`,
                    data: opt,
                    type: 'value'
                })
            ) ?? []
            auxButtons = BuilderMarkups.selection
        } else if (parser.State === 'CTX') { // show context options
            byStateButtons = parser.AvaliableContexts.map(ctx => Makaper.toMarkup({
                text: `${ctx}${parser.CurrentContext === ctx ? " " + UiUnicodeSymbols.check : ""}`,
                data: ctx,
                type: "value",
                isRead: false})
            )
            auxButtons = BuilderMarkups.selection
        } else if (parser.State === 'WAIT_NEXT_V') { // show next value set options
            const type = parser.NextValueSetType
            const val = parser.NextValueSetValue
            if (type === 'standalone') {
                const isToggledOn = parser.isStandaloneRead(val!)
                byStateButtons = [
                    this.toMarkup({
                        text: `Toggle-${isToggledOn ? "Off" : "On"}`,
                        type: 'value',
                        data: val!,
                    }),
                ]
                text.info += `Click to toggle standalone "${val}" to ${isToggledOn ? "Off" : "On"}`
            } else if (type === 'positional') {
                const desc_l = parser.findDescriptor(val!)
                if (!desc_l) {
                    throw new Error(`Cannot find descriptor for positional setted by next value setter handler: ${val}`)
                }
                text.info += `input positional(${desc_l.position}) value:`
                byStateButtons = desc_l.pairOptions?.map(opt =>
                    this.toMarkup({
                        text: `${opt}`,
                        data: opt,
                        type: 'value'
                    })
                ) ?? []
            } else {
                throw new Error(`Unknown next value set type ${type}`)
            }
            auxButtons = BuilderMarkups.selection
        } else { // show avalable args
            byStateButtons = parser.Descriptor.args.filter(desc => desc.ctx === parser.CurrentContext).map(desc => {
                const isPair = desc.standalone == false && desc.position == null
                const isStandalone = desc.standalone
                return this.toMarkup({
                    text: `${desc.name}${parser.isRead(desc.name, desc.ctx) ? " " + UiUnicodeSymbols.check : ""}`,
                    data: `${isPair ? '--' : isStandalone ? '-' : ''}${desc.name}`,
                    type: 'name',
                    isRead: parser.isNameRead(desc.name)
                })
            })
        }

        const mk_text = text.overwrite ?
            text.overwrite :
            this.BuildingString(parser.toRawState(), infoText, text.addTo)

        const mergedButtons = [
            ...byStateButtons,
            ...auxButtons,
            ...(options.extra_buttons ?? [])
        ]

        return {
            text: mk_text,
            buttons: mergedButtons
        }
    }
}

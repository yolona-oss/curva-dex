import { UiUnicodeSymbols } from "@core/ui"
import { ICompiledReadArg } from "./types"
import { CBState, ICBStateRaw } from './interpreter'
import { defaultBuilderMarkupOptions } from '../constants'
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


    static BuildingString(bstate: ICBStateRaw, info = "", addTo: "begining"|"end" = "begining"): string {
        const command = bstate.command
        let buildStr = `${UiUnicodeSymbols.hammer} Building "${command}"\n\nReaded:`

        const readArgToStr = (arg: ICompiledReadArg) => {
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
            return ` - ${UiUnicodeSymbols.warning} (unkown ctx: "${arg.ctx}") ${arg.name}: ${arg.value}`
        }

        const argGroupToString = (name: string, group: ICompiledReadArg[]) => {
            let str = `\n* ${name}:`
            for (const arg of group) {
                str += '\n' + readArgToStr(arg)
            }
            return str
        }

        const args = bstate.read.filter(arg => arg.ctx === "args")
        const configs = bstate.read.filter(arg => arg.ctx === "config")
        const params = bstate.read.filter(arg => arg.ctx === "params")
        const messages = bstate.read.filter(arg => arg.ctx === "message")

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
    static __tmpMarkup(bstate: CBState) {
        const desc = bstate.toState().descriptor
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

        const overwrite = `${UiUnicodeSymbols.hammer} Run CmdBuilder\nBuilding command: - ${UiUnicodeSymbols.arrowRight} "${bstate.BuildingCommand}".\n - Avalible context: ${UiUnicodeSymbols.arrowRight} ${bstate.toState().avaliableCtxs.join(", ")}.\n${desc_str}`
        return Makaper.markup(bstate, {
            text: {
                overwrite,
                info: "",
            },
        })
    }

    static markup(bstate: CBState, {text, options}: IMakaperBuildOpts): IBaseMarkup {
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

        const descArgs = bstate.toState().descriptor.args
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
            markuped = descArgs.filter(arg => arg.ctx === bstate.CurrentContext).map(arg => 
                this.toMarkup({
                    text: arg.name,
                    type: 'name',
                    isRead: bstate.isNameRead(arg.name)
                })
            )
        }

        // TODO its too not open-close 
        if (bstate.WaitingFor === 'ctx') {
            markuped = bstate.AvaliableContexts.map(ctx => Makaper.toMarkup({text: ctx, type: "value", isRead: false}))
        }

        const mk_text = text.overwrite ?
            text.overwrite :
            this.BuildingString(bstate.toState(), infoText, text.addTo)

        return {
            text: mk_text,
            options: [
                ...markuped,
                ...(options.defaultsOverwrite ?? defaultBuilderMarkupOptions),
                ...(options.defaultsAppend ?? [])
            ]
        }
    }
}

import { CmdArgument, IUICommandProcessed } from "@core/ui/types/command"
import { BuiltInHelpCommandsEnum } from "../constants"
import { CHComposer } from "../ch-composer"
import { BuiltInCommand } from "../types/built-in-cmd"
import { ICmdCallback, ICmdService } from "../types"
import { anyToString } from "@core/utils/misc"
import { BaseCommandService } from "../command-service"
import { UiUnicodeSymbols } from "@core/ui"

export const serviceToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const executor = cmdCb.execMixin as ICmdService
    return `Service /${cmdName},\n
${UiUnicodeSymbols.magnifierGlass} Description: ${cmdCb.description},\n
${UiUnicodeSymbols.gear} Params: ${JSON.stringify(executor.paramsDescriptor(), null, 4)},\n
${UiUnicodeSymbols.gear} Config: ${JSON.stringify(executor.configDescriptor(), null, 4)},\n
${UiUnicodeSymbols.magnifierGlass} Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
${UiUnicodeSymbols.magnifierGlass} Prev: ${cmdCb.prev ?? "None"}\n\
`
}

export const commonToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const argsStr = cmdCb.args?.map(a => a.name).join(",\n")
    return `Command ${cmdName},\n\
${UiUnicodeSymbols.magnifierGlass} Description: ${cmdCb.description},\n\
${argsStr ? `${UiUnicodeSymbols.gear} Args:\n${argsStr}\n` : ""}\
${UiUnicodeSymbols.magnifierGlass} Next: ${cmdCb.next?.join(", ") ?? `${UiUnicodeSymbols.cross} None`}\n\
${UiUnicodeSymbols.magnifierGlass} Prev: ${cmdCb.prev ?? `${UiUnicodeSymbols.cross} None`}\
`
}

export const uiCommandsToString = (commands: IUICommandProcessed[]): string => {
    return commands.map(v => {
        let argsStr: string = ""
        if (v.args) {
            const args = v.args
            for (const arg of args) {
                argsStr += ` -- ${'<' + arg.name + '>' + (!arg.required ? ` (${UiUnicodeSymbols.question} optional)` : "")} ${arg.description ?? `${UiUnicodeSymbols.cross} No description`}\n`
            }
        }
        return `Command: /${v.command},\n\
${UiUnicodeSymbols.magnifierGlass} Description: ${v.description},\n\
${argsStr ? `${UiUnicodeSymbols.gear} Arguments:\n${argsStr}\n` : ""}\
`
    }).join("\n")
}

/////////////////////////

const CommonHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.HELP_COMMAND,
    description: "List all available commands.",
    exec: async function(this: CHComposer<any>, _: string[], ctx) {
        const commands = this.mapHandlersToUICommands()
        const commandsStr = uiCommandsToString(commands)
        await ctx.reply(commandsStr)
    }
}

/////////////////////////

class ConcreetHelpArgs {
    @CmdArgument({
        required: true,
        standalone: true,
        description: "Command name",
        defaultValue: "help",
        pairOptions: async (_: string, handler: CHComposer<any>) => {
            return handler.mapHandlersToUICommands().map(c => c.command)
        }
    })
    command!: String
}

const ConcreetHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.CHELP_COMMAND,
    description: "Print help for concreet command",
    args: ConcreetHelpArgs,
    exec: async function(this: CHComposer<any>, args: string[], ctx) {
        const command = args[0]

        try {
            const cb = this.getCallbackFromCommandName(command)
            const isService = cb.execMixin instanceof BaseCommandService
            const commandHelpStr = isService ? serviceToString(command, cb) : commonToString(command, cb)
            await ctx.reply(commandHelpStr)
        } catch(e: any) {
            if (e && typeof e === 'object' && 'success' in e) {
                await ctx.reply(e.text)
            }
            await ctx.reply(`${UiUnicodeSymbols.error} Unknown error:\n -- ${anyToString(e)}`)
        }
    }
}

/////////////////////////

export {
    CommonHelp,
    ConcreetHelp,
}

import { CmdArgument, ICmdService, isService, IUICommandProcessed } from "@core/ui/types/command"
import { BuiltInHelpCommandsEnum } from "../constants"
import { CmdDispatcher } from "../dispatcher"
import { BuiltInCommand } from "../types/built-in-cmd"
import { IDispatcherUICmdInvokable } from "../types"
import { anyToString } from "@core/utils/misc"
import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"
import { CmdArgumentProxy } from "../arg-proxy"

export const serviceToString = <Ctx extends BaseUIContext>(cmdName: string, cmdCb: IDispatcherUICmdInvokable<Ctx>) => {
    const executor = cmdCb.invokable as ICmdService
    return `Service /${cmdName},\n
Description:\n  ${cmdCb.description},\n
Params: ${JSON.stringify(executor.paramsDescriptor(), null, 4)},\n
Config: ${JSON.stringify(executor.configDescriptor(), null, 4)},\n
Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
Prev: ${cmdCb.prev ?? "None"}\n\
`
}

export const commonToString = <Ctx extends BaseUIContext>(cmdName: string, cmdCb: IDispatcherUICmdInvokable<Ctx>) => {
    const argsStr = cmdCb.args?.map(a => a.name).join(",\n")
    return `Command ${cmdName},\n\
Description: ${cmdCb.description},\n\
${argsStr ? `Args:\n  ${argsStr}\n` : ""}\
$Next: ${cmdCb.next?.join(", ") ?? `${UiUnicodeSymbols.cross} None`}\n\
$Prev: ${cmdCb.prev ?? `${UiUnicodeSymbols.cross} None`}\
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
Description: ${v.description},\n\
${argsStr ? `Arguments:\n  ${argsStr}\n` : ""}\
`
    }).join("\n")
}

/////////////////////////

const CommonHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.HELP_COMMAND,
    description: "List all available commands.",
    invokable: async function(this: CmdDispatcher<any>, _, ctx) {
        const commands = this.toUICommands()
        const commandsStr = uiCommandsToString(commands)
        await ctx.reply(commandsStr)
    }
}

/////////////////////////

class ConcreetHelpArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Command name",
        defaultValue: "help",
        pairOptions: async (_: string, handler: CmdDispatcher<any>) => {
            return handler.toUICommands().map(c => c.command)
        }
    })
    command!: String
}

const ConcreetHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.CHELP_COMMAND,
    description: "Print help for concreet command",
    args: ConcreetHelpArgs,
    invokable: async function(this: CmdDispatcher<any>, args: CmdArgumentProxy, ctx) {
        const command = args.getOrThrow('command')

        try {
            const cb = this.getInvokable(command)
            const commandHelpStr = isService(cb.invokable) ? serviceToString(command, cb) : commonToString(command, cb)
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

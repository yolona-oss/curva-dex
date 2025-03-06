import { CmdArgument, getCmdArgMetadata, IUICommandSimple } from "@core/ui/types/command"
import { BuiltInHelpCommandsEnum } from "../constants"
import { MotherCmdHandler } from "../mother-cmd-handler"
import { BuiltInCommand } from "../types/built-in-cmd"
import { ICmdCallback, ICmdService } from "../types"
import { anyToString } from "@core/utils/misc"
import { BaseCommandService } from "../command-service"

export const serviceToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const executor = cmdCb.execMixin as ICmdService
    return `Service ${cmdName},\n
Description: ${cmdCb.description},\n
Params: ${JSON.stringify(executor.paramsDescriptor(), null, 4)},\n
Config: ${JSON.stringify(executor.configDescriptor(), null, 4)},\n
Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
Prev: ${cmdCb.prev ?? "None"}\n\
`
}

export const commonToString = <Ctx>(cmdName: string, cmdCb: ICmdCallback<Ctx>) => {
    const argsStr = cmdCb.args?.map(a => a.name).join(", ")
    return `Command ${cmdName},\n\
Description: ${cmdCb.description},\n\
${argsStr ? `Args: ${argsStr}\n` : ""}\
Next: ${cmdCb.next?.join(", ") ?? "None"}\n\
Prev: ${cmdCb.prev ?? "None"}\
`
}

export const uiCommandsToString = (commands: IUICommandSimple[]): string => {
    return commands.map(v => {
        let argsStr: string = ""
        if (v.args) {
            const meta = v.args
            for (const key in meta) {
                const arg = meta[key]
                argsStr += `${key}: ${arg.description ?? "No description"}\n`
            }
        }
        return `Command: ${v.command},\n\
Description: ${v.description},\n\
${argsStr ? `Args: ${argsStr}\n` : ""}\
`
    }).join("\n")
}

/////////////////////////

const CommonHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.HELP_COMMAND,
    description: "List all available commands.",
    exec: async function(this: MotherCmdHandler<any>, _: string[], ctx) {
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
        pairOptions: async (_: string, handler: MotherCmdHandler<any>) => {
            return handler.mapHandlersToUICommands().map(c => c.command)
        }
    })
    command!: String
}

const ConcreetHelp: BuiltInCommand = {
    command: BuiltInHelpCommandsEnum.CHELP_COMMAND,
    description: "Print help for concreet command",
    args: ConcreetHelpArgs,
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
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
            await ctx.reply(`Unknown error: ${anyToString(e)}`)
        }
    }
}

/////////////////////////

export {
    CommonHelp,
    ConcreetHelp,
}

import { CmdArgument, IArgumentCompiled, isFunc } from "@core/ui/types/command"
import { BuiltInServiceCommandsEnum } from "../constants"
import { ICmdService } from "@core/ui/types/command"
import { BuiltInCommand } from "../types/built-in-cmd"
import { CHComposer } from "../ch-composer"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"

class ServiceStopArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Service name to stop",
        pairOptions: async (_, handler, owner) => {
            return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
        }
    })
    service!: String

}

const ServiceStopCommand: BuiltInCommand = {
    command: BuiltInServiceCommandsEnum.STOP_COMMAND,
    description: "Stop service with passed name <service-name>.",
    args: ServiceStopArgs,
    callback: async function(this: CHComposer<any>, args: IArgumentCompiled[], ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args[0]
        try {
            const res = await this.terminateService(userId, serviceName)
            await ctx.reply(`${UiUnicodeSymbols.success} Service "${serviceName}" terminated: ${res}`)
        } catch(e: any) {
            throw `${UiUnicodeSymbols.error} Service "${serviceName}" termination error:\n -- ${anyToString(e)}.`
        }
    }
}

/////////////////////////

class ServiceRunArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Service name to run",
        pairOptions: async (_, handler, __) => {
            return handler.getRegistredServiceNames()
        }
    })
    service!: String
}

const ServiceRunCommand: BuiltInCommand = {
    command: BuiltInServiceCommandsEnum.RUN_COMMAND,
    description: "Run service with passed name <service-name>. NOCONFIG!!!",
    args: ServiceRunArgs,
    callback: async function(this: CHComposer<any>, args: IArgumentCompiled[], ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args.find(a => a.position === 1)!.value

        if (!serviceName) {
            throw `Service name not found`
        }

        try {
            const res = await this.CommandInvoker.invoke(userId, {command: serviceName, args: []}, ctx)
            await ctx.reply(`Service ${serviceName} started: ${res}`)
        } catch(e: any) {
            await ctx.reply(`Service ${serviceName} termination error: ${anyToString(e)}.`)
        }
    }

}

/////////////////////////

class ServiceSendMsgArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Service name to send message",
        pairOptions: async function(_, composer, owner): Promise<string[]> {
            return composer.UserActiveServices(String(owner.userId)).map(s => s.name)
        }
    })
    service!: String

    @CmdArgument({
        required: true,
        position: 2,
        description: "Message name",
        pairOptions: async (serviceName, handler, __) => {
            try {
                const cb = handler.getCallbackFromCommandName(serviceName)
                if (isFunc(cb.callback)) {
                    throw `Command "${serviceName}" is not a service.`
                }
                const instance = cb.callback as ICmdService
                const messages = instance.receiveMsgDescriptor()

                return Object.keys(messages)
            } catch (e: any) {
                return []
            }
        }
    })
    message!: String

    @CmdArgument({
        required: false,
        position: 3,
        description: "Message additional args",
        pairOptions: []
    })
    args?: String
}

const ServiceSendMsgCommand: BuiltInCommand = {
    command: BuiltInServiceCommandsEnum.SEND_MSG_COMMAND,
    description: "Send message to service with passed name <service-name> and <message> with optional args.",
    args: ServiceSendMsgArgs,
    callback: async function(this: CHComposer<any>, args: IArgumentCompiled[], ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args[0]
        const messageName = args[1]
        const messageArgs = args.slice(2)
        try {
            const activeService = this.UserActiveServices(userId).find(s => s.name === serviceName)
            if (!activeService) {
                throw `Service ${serviceName} not found`
            }
            const res = await activeService.receiveMsg(messageName, messageArgs)
            await ctx.reply(`Message ${messageName} sent: ${res}`)
        } catch(e: any) {
            await ctx.reply(`Message ${messageName} sending error: ${anyToString(e)}.`)
        }
    }
}

/////////////////////////

export {
    ServiceStopCommand,
    ServiceRunCommand,
    ServiceSendMsgCommand
}

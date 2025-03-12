import { CmdArgument } from "@core/ui/types/command"
import { BuiltInServiceCommandsEnum } from "../constants"
import { ICmdService } from "../types"
import { BuiltInCommand } from "../types/built-in-cmd"
import { MotherCmdHandler } from "../mother-cmd-handler"
import log from "@core/utils/logger"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"

class ServiceStopArgs {
    @CmdArgument({
        required: true,
        standalone: true,
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
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
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
        standalone: true,
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
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args[0]

        try {
            const res = await this.execute(userId, serviceName, [], ctx)
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
        standalone: true,
        description: "Service name to send message",
        pairOptions: async (_, handler, owner) => {
            return handler.UserActiveServices(String(owner.userId)).map(s => s.name)
        }
    })
    service!: String

    @CmdArgument({
        required: true,
        standalone: true,
        description: "Message name",
        pairOptions: async (serviceName, handler, __) => {
            try {
                const cb = handler.getCallbackFromCommandName(serviceName)
                if (cb.execMixin instanceof Function) {
                    throw ""
                }
                const instance = cb.execMixin as ICmdService
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
        standalone: true,
        description: "Message additional args",
        pairOptions: []
    })
    args?: String
}

const ServiceSendMsgCommand: BuiltInCommand = {
    command: BuiltInServiceCommandsEnum.SEND_MSG_COMMAND,
    description: "Send message to service with passed name <service-name> and <message> with optional args.",
    args: ServiceSendMsgArgs,
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args[0]
        const messageName = args[1]
        const messageArgs = args.slice(2)
        try {
            const service = this.UserActiveServices(userId).find(s => s.name === serviceName)
            if (!service) {
                throw `Service ${serviceName} not found`
            }
            const res = await service.receiveMsg(messageName, messageArgs)
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

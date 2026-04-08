import { CmdArgument, isFunc } from "@core/ui/types/command"
import { BuiltInServiceCommandsEnum } from "../constants"
import { ICmdService } from "@core/ui/types/command"
import { BuiltInCommand } from "../types/built-in-cmd"
import { CmdDispatcher } from "../dispatcher"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"
import { CmdArgumentProxy } from "../arg-proxy"

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
    invokable: async function(this: CmdDispatcher<any>, args: CmdArgumentProxy, ctx) {
        const userId = String(ctx.manager.userId)

        const serviceName = args.getOrThrow('service')
        try {
            const res = await this.terminateService(userId, serviceName)
            await ctx.reply(`${UiUnicodeSymbols.success} Service "${serviceName}" terminated: ${res ?? "No-service-response"}`)
        } catch(e: any) {
            throw `${UiUnicodeSymbols.error} Service "${serviceName}" termination error:\n  -- ${anyToString(e)}.`
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
    invokable: async function(this: CmdDispatcher<any>, args: CmdArgumentProxy, ctx, uiImpl) {
        const userId = String(ctx.manager!.userId)

        const serviceName = args.getOrThrow('service')

        try {
            const res = await this.CommandInvoker.invoke(userId, {command: serviceName, proxy: new CmdArgumentProxy([]), raw: []}, ctx, uiImpl)
            await ctx.reply(`${UiUnicodeSymbols.success} Service "${serviceName}" started: ${res}`)
        } catch (e: any) {
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
        pairOptions: async function(_, dispatcher, owner): Promise<string[]> {
            return dispatcher.UserActiveServices(String(owner.userId)).map(s => s.name)
        }
    })
    service!: String

    @CmdArgument({
        required: true,
        position: 2,
        description: "Message name",
        pairOptions: async (serviceName, handler, __) => {
            try {
                const cb = handler.getInvokable(serviceName)
                if (isFunc(cb.invokable)) {
                    throw `Command "${serviceName}" is not a service.`
                }
                const instance = cb.invokable as ICmdService
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
    invokable: async function(this: CmdDispatcher<any>, args: CmdArgumentProxy, ctx) {
        const userId = String(ctx.manager!.userId)
        const serviceName = args.getOrThrow('service')
        const messageName = args.getOrThrow('message')
        const messageArgs = args.get('args') ?? ''
        try {
            const activeService = this.UserActiveServices(userId).find(s => s.name === serviceName)
            if (!activeService) {
                throw `Service ${serviceName} not found`
            }
            const res = await activeService.receiveMsg(messageName, messageArgs.split(' '))
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

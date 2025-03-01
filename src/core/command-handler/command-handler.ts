import {
    DefaultSeqCommandsEnum,
    DefaultServiceCommandsEnum,
    DefaultAccountCommandsEnum,
    DefaultHelpCommandsEnum,
} from "@core/constants/command";
import { Account } from "@core/db";
import { WithInit } from "@core/types/with-init";
import { WithNeighbors, validateWithNeighborsMap } from "@core/types/with-neighbors";
import { BaseUIContext, IUICommandSimple } from "@core/ui/types";

import log from '@utils/logger'

import { SequenceHandler } from "./sequence-handler";
import { BaseCommandService } from "./command-service";

import { DefaultCommandsMap } from './defaults-command-map'
import { CommandBuilder, IBuilderMarkup, IBuilderMarkupOption, ICommandDescriptor, ICommandDescriptorArg, ReadingCtxType } from "./command-builder";
import { DefaultTgUICommands } from "@core/ui/telegram/constants";

// NOTE: add ctx extension from base ui ctx

export type IHandlerFunction<Ctx> = (ctx: Ctx) => Promise<string|void>
export type IHandlerService = BaseCommandService<any, any, any>

export type IHandler<Ctx> = IHandlerFunction<Ctx> | IHandlerService

interface IHandleCallback<Ctx> extends Partial<WithNeighbors> {
    fn: IHandler<Ctx>
    description: string
    args?: string[]
}

type IHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

export interface ICmdRegister<Ctx> {
    command: IHandlerCommand,
    handler: IHandler<Ctx>
}

export type ICmdRegisterMany<Ctx> = Array<ICmdRegister<Ctx>>

export interface IHandleResult {
    isError: boolean
    text?: string
    markup?: IBuilderMarkupOption[]
}

export const BLANK_USER_ID = "__pussy-killer__"

const DefaultCommands = [
    ...Object.values(DefaultSeqCommandsEnum),
    ...Object.values(DefaultServiceCommandsEnum),
    ...Object.values(DefaultAccountCommandsEnum),
    ...Object.values(DefaultHelpCommandsEnum)
]

export class CommandHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, IHandleCallback<TContext>> // name -> callback
    private sequenceHandler?: SequenceHandler
    private activeServices: Map<string, Array<BaseCommandService<any, any, any>>> // userId -> services
    private cmdBuilder: CommandBuilder

    constructor() {
        super()
        this.callbacks = new Map()
        this.activeServices = new Map()
        this.cmdBuilder = new CommandBuilder()
    }

    done() {
        //const graph = this.createCommandSequenceGraph();

        //printGraph(graph)

        if (!validateWithNeighborsMap(this.callbacks)) {
            throw new Error("CommandHandler::done() invalid callbacks map");
        }

        const targets: string[] = Array.from(this.callbacks.keys())
        const naighbors: IHandleCallback<TContext>[] = Array.from(this.callbacks.values())
        this.sequenceHandler = new SequenceHandler(
            Array.from(
                targets.map((v, i) =>
                    ({
                        target: v,
                        next: naighbors[i].next,
                        prev: naighbors[i].prev
                    })
                )
            )
        )

        this.setInitialized()
    }

    async stop() {
        for (const [userId, services] of this.activeServices) {
            log.echo(" -- Stoping services for user: " + userId)
            const terminatePromises = []
            for (const s of services) {
                log.echo("  -- terminating service: " + s.name)
                await s.terminate()
                terminatePromises.push(
                    new Promise(resolve => s.on("done", resolve))
                )
            }
            await Promise.all(terminatePromises)
            log.echo("  -- All services for user: " + userId + " stopped")
        }
        log.echo(" -- All services stopped")
    }

    public registerMany(commands: Array<{
        command: IHandlerCommand,
        handler: IHandler<TContext>
    }>) {
        commands.forEach(cmd => this.register(cmd.command, cmd.handler))
    }

    public register(command: IHandlerCommand, handler: IHandler<TContext>) {
        if (command.command in this.callbacks) {
            throw new Error("CommandHandler.register() command already registered: " + command.command);
        }
        if (DefaultCommandsMap.map(c => c.command).includes(command.command)) {
            throw new Error("CommandHandler.register() command already registered as default: " + command.command);
        }
        this.callbacks.set(
            command.command,
            {
                fn: handler,
                description: command.description,
                args: command.args,
                next: command.next,
                prev: command.prev
            }
        );
    }

    isServiceActive(userId: string, serviceName: string) {
        const services = this.activeServices.get(userId)
        if (!services) {
            return false
        }
        return services.map(s => s.name).includes(serviceName)
    }

    isCommandHaveAllArgs(command: string, args: string[]) {
        if (DefaultCommandsMap.map(c => c.command).includes(command)) {
            const cmdArgs =  DefaultCommandsMap.find(c => c.command === command)?.args
            if (cmdArgs) {
                return cmdArgs.every(a => args.includes(a))
            }
        }

        const cmd = this.callbacks.get(command)
        if (!cmd) {
            throw `Command ${command} not found`
        }
        if (cmd.fn instanceof Function) {
            if (!cmd.args) {
                return true
            }
            const requiredArgs = cmd.args.filter(a => !a.startsWith("?"))
            for (const arg of requiredArgs) {
                if (!args.includes(arg)) {
                    return false
                }
            }
        } else {
            return false
        }
        return true
    }

    isBuiltInCommand(command: string) {
        return DefaultCommandsMap.map(c => c.command).includes(command)
    }

    /**
     * TODO: refactor with chaining of handlers
     */
    public async handleCommand(input: string, ctx: TContext): Promise<IHandleResult> {
        const cb = this.callbacks.get(input);
        const args = this.getArgs(ctx.text!)
        const _userId = ctx.manager?.userId
        const userId = String(_userId)

        if (!_userId) {
            return {
                isError: true,
                text: "CommandHandler.handleCommand() No user id."
            }
        }

        // resume builder
        if (this.cmdBuilder.isUserOnBuild(userId)) {
            const res = this.cmdBuilder.handle(userId, input)

            return {
                isError: Boolean(res.error),
                text: res.markup.text,
                markup: res.markup.options
            }
        }

        let isNeedToStartBuilder
        try {
            isNeedToStartBuilder = !this.isCommandHaveAllArgs(input, args)
        } catch (e) {
            isNeedToStartBuilder = false
        }
        if (isNeedToStartBuilder) {
            let cb
            let isBuiltIn = true
            let isService = false
            let isActive = false

            if (this.isBuiltInCommand(input)) {
                cb = DefaultCommandsMap.find(c => c.command === input)
            } else {
                cb = this.callbacks.get(input)!
                isService = cb.fn instanceof BaseCommandService
                isActive = isService ? this.isServiceActive(userId, cb.fn.name) : false
                isBuiltIn = false
            }

            const ctxs: ReadingCtxType[] =
                isService ?
                    isActive ?
                        ['message'] :
                        ['params', 'config'] :
                    ['args']

            let desc: ICommandDescriptor = { args: [] }

            if (isService && !isBuiltIn) {
                const service = (cb as IHandleCallback<TContext>).fn as BaseCommandService

                const cfg_args: ICommandDescriptorArg[] = service.configEntries().map(c => ({
                    ctx: 'config',
                    name: c.path
                }))
                const params_args: ICommandDescriptorArg[] = service.paramsEntries().map(c => ({
                    ctx: 'params',
                    name: c.path
                }))
                const msg_args: ICommandDescriptorArg[] = service.receiveMsgEntries().map(c => ({
                    ctx: 'message',
                    name: c.path
                }))

                desc.args = isActive ? msg_args : params_args.concat(cfg_args)
            } else if (!isService && !isBuiltIn) {
                const args_args: ICommandDescriptorArg[] = (cb as IHandleCallback<TContext>).args?.map(a => ({
                    ctx: 'args',
                    name: a
                })) ?? []

                desc = {
                    args: args_args
                }
            } else if (isBuiltIn) {
                desc = {
                    args: (DefaultCommandsMap.find(c => c.command === input)?.args ?? []).map(a => ({
                        ctx: 'args',
                        name: a
                    }))
                }
            }

            const res = this.cmdBuilder.startBuild(userId, input, desc, ctxs)

            return {
                isError: false,
                text: res.text,
                markup: res.options
            }
        }

        if (!cb && !DefaultCommands.includes(input)) {
            return {
                isError: true,
                text: 'Unknown command "' + input + '".'
            }
        }

        // ---- Builtin cmd handling START
        // must be in this order sequence -> account -> service
        const defaultCmdHandlers = [
            this.handleHelpCommand,
            this.handleSequenceCommand,
            this.handleAccountCommand,
            this.handleServiceCommand,
        ]

        for (const handler of defaultCmdHandlers) {
            const error = await handler.bind(this)(input, ctx, userId, args)
            if (error) {
                return {
                    isError: true,
                    text: error
                }
            }
            // ---- Builtin cmd handling END

            if (!cb) {
                return {
                    isError: true,
                    text: 'CommandHandler.handleCommand() Unknown command "' + input + '".'
                }
            }

            try {
                if (typeof cb.fn === 'function') { // simple command
                    const res = await cb.fn(ctx)
                    return {
                        isError: Boolean(res),
                        text: String(res)
                    }
                } else if (cb.fn) { // service exe command
                    //const serviceName = cb.fn.name
                    const serviceName = input
                    const args = this.getArgs(String(ctx.text))

                    if (!this.activeServices.has(userId)) {
                        this.activeServices.set(userId, [])
                    }

                    if (this.activeServices.get(userId)!.map(serv => serv.name).includes(serviceName)) {
                        return {
                            isError: true,
                            text: `Service ${serviceName} already active.`
                        }
                    }

                    const serviceInstance = cb.fn.clone(userId, args, serviceName)

                    serviceInstance.on("message", async (message: string) => {
                        await this.sendMessageToContext(ctx, message)
                    })
                    //cb.fn.on("liveLog")
                    serviceInstance.on('done', async (msg: string = "") => {
                        await this.handleServiceDone(userId, serviceInstance.name, ctx, msg)
                    })
                    log.echo("-- Starting service: " + serviceInstance.name)
                    await serviceInstance.Initialize()
                    this.activeServices.get(userId)!.push(serviceInstance)
                    serviceInstance.run()
                }
            } catch (e: any) {
                log.error("CommandHandler.handleCommand() Command handling error: " + e)
                return {
                    isError: true,
                    text: String(e)
                }
            }
        }
        return {
            isError: false,
            text: ""
        }
    }

    private removeService(userId: string, serviceName: string) {
        const services = this.activeServices.get(userId)
        if (!services) {
            log.error("CommandHandler.removeService() No active services for user: " + userId)
            return
        }
        services.splice(services!.map(serv => serv.name).indexOf(serviceName), 1)
    }

    private async handleServiceDone(userId: string, serviceName: string, ctx: TContext, msg: string) {
        log.echo("-- Service done: " + serviceName)
        this.removeService(userId, serviceName)

        await this.sendMessageToContext(ctx, `Service ${serviceName} done. ${msg}`.trim())
    }

    private async sendMessageToContext(ctx: TContext, message: string) {
        if (ctx.reply) {
            await ctx.reply(message)
        } else {
            log.error(`No reply function in context. Unhandled message: "${message}"`)
        }
    }

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }

    public mapHandlersToCommands(): IUICommandSimple[] {
        let cmd = this.callbacks.keys().toArray()
        const desc = this.callbacks.values().map(v => v.description).toArray()
        const args = this.callbacks.values().map(v => v.args).toArray()

        const registredCmds = new Array(cmd.length).fill(0).map(
            (_, i) => ({
                command: cmd[i],
                description: desc[i],
                args: args[i]}
            )
        )

        return DefaultCommandsMap.concat(registredCmds).concat(DefaultTgUICommands)
    }

    public createCommandSequenceGraph() {
        return null;
    }

    /// Builtin defaults command execution handlers --- #START --- 
    private async handleHelpCommand(command: string, _: TContext, __: string, arg: string[]) {
        switch (command) {
            case DefaultHelpCommandsEnum.HELP_COMMAND:
                return this.mapHandlersToCommands().map(v =>
                    `Command: ${v.command},\n\
Description: ${v.description},\n\
Args: ${v.args?.join(", ")}\n\
`
                ).join("\n")
            case DefaultHelpCommandsEnum.CHELP_COMMAND:
                const cmd = this.callbacks.get(arg[0])
                if (!cmd) {
                    return `Command ${arg[0]} not found`
                }
                if (cmd.fn instanceof Function) {
                    return `Command ${arg[0]},\n\
Description: ${cmd.description},\n\
Args: ${cmd.args?.join(", ")}\n\
Next: ${cmd.next?.join(", ") ?? "None"}\n\
Prev: ${cmd.prev ?? "None"}\
`
                } else {
                    return `Service ${arg[0]},\n
Description: ${cmd.description},\n
Params: ${JSON.stringify(cmd.fn.paramsEntries(), null, 4)},\n
Config: ${JSON.stringify(cmd.fn.configEntries(), null, 4)},\n
Next: ${cmd.next?.join(", ") ?? "None"}\n\
Prev: ${cmd.prev ?? "None"}\n\
`
                }
        }
        return null
    }

    private async handleAccountCommand(command: string, ctx: TContext, _: string, arg: string[]) {
        const account = await Account.findById(ctx.manager!.account)
        if (!account) {
            return "Account not found."
        }
        const module_name = arg[0]
        const vname = arg[1]
        const vvalue = arg[2]
        switch (command) {
            case DefaultAccountCommandsEnum.SET_VARIABLE:
                if (arg.length < 3) {
                    return "No module name or variable name or value passed"
                }

                await account!.setModuleData(module_name, vname, vvalue)

                return "Variable setted. Current data for context:\n" + JSON.stringify(account.modules.find(m => m.module === arg[0]), null, 4)
            case DefaultAccountCommandsEnum.REMOVE_VARIABLE:
                if (arg.length < 2) {
                    return "No module name or variable name passed"
                }

                await account.unsetModuleData(module_name, vname)

                return "Variable unsetted"
            case DefaultAccountCommandsEnum.GET_VARIABLE:
                if (arg.length < 2) {
                    return "No module name or variable name passed"
                }
                return JSON.stringify(
                    await account.getModuleData(module_name, vname),
                    null,
                    4
                )
        }
        return null
    }

    private handleSequenceCommand(command: string, _: TContext, userId: string, __: string[]) {
        let seq_exe_error
        try {
            seq_exe_error = this.sequenceHandler!.handle(userId, command)
        } catch (e: any) {
            log.error(`CommandHandler.handleCommand() Sequence handling error: ` + e)
            seq_exe_error = String(e instanceof Error ? e.message : e)
        }
        if (seq_exe_error) { // err or default seq comands passed :) im too smart :_)
            return seq_exe_error
        }
        return null
    }

    private async handleServiceCommand(command: string, _: TContext, userId: string, arg: string[]) {
        // stop services
        if (command === DefaultServiceCommandsEnum.STOP_COMMAND) {
            if (arg.length == 0) {
                return "No service name passed"
            }
            const serviceName = arg[0]
            const userServices = this.activeServices.get(userId)!
            const userServicesNames = userServices.map(s => s.name)
            if (userServicesNames.includes(serviceName)) {
                await userServices.find(serv => serv.name === serviceName)!.terminate()
                userServices.splice(userServicesNames.indexOf(serviceName), 1)
                return `Service "${serviceName}" stopped.`
            } else {
                return `Service ${serviceName} not active.`
            }
        } else if (command === DefaultServiceCommandsEnum.SEND_MSG_COMMAND) {
            if (arg.length < 2) {
                return "No service name and message passed"
            }
            const serviceName = arg[0]
            const msg = arg[1]
            const msgArg = arg.slice(2)

            if (!this.activeServices.has(userId)) {
                this.activeServices.set(userId, [])
            }
            const userServices = this.activeServices.get(userId)!
            const userServicesNames = userServices.map(s => s.name)
            if (userServicesNames.includes(serviceName)) {
                await userServices.find(serv => serv.name === serviceName)!.receiveMsg(msg, msgArg)
                return `Service "${serviceName}" message sent.`
            } else {
                return `Service ${serviceName} not active.`
            }
        }
        return null
    }

    /// Builtin defaults command execution handlers --- #END --- 
}

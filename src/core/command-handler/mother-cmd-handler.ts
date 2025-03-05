import { WithInit } from "@core/types/with-init";
import { validateWithNeighborsMap } from "@core/types/with-neighbors";
import { BaseUIContext, IUICommandSimple } from "@core/ui/types";

import log from '@utils/logger'

import { SequenceHandler } from "./sequence-handler";
import { BaseCommandService } from "./command-service";

import { BuiltInUICmdArray } from './built-in-cmd'
import { DefaultTgUICommands } from "@core/ui/telegram/constants";

import { Chain } from "@core/utils/chain";
import {
    ICommandHandlerChain,
    ICmdCallback,
    ICmdHandlerCommand,
    ICmdHandlerExecResult,
    ICmdMixin,
    ICmdRegisterMany,
    IArgReadResult,
    ICmdService,
    ICmdFunction
} from "./types";
import { CommandBuilder } from "./command-builder";
import { HandleAccountCommand, HandleCallbackExecution, HandleCmdBuilder, HandleHelpCmd, HandleSequenceCommand, HandleServiceCommand } from "./handlers";
import { isEqual } from "@core/utils/array";
import { anyToString } from "@core/utils/misc";

// TODO RENAME IT!!!
export class MotherCmdHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, ICmdCallback<TContext>> // name -> callback
    private sequenceHandler?: SequenceHandler
    private activeServices: Map<string, Array<BaseCommandService<any, any, any>>> // userId -> services
    private cmdBuilder: CommandBuilder

    private chain: ICommandHandlerChain<TContext>

    constructor() {
        super()
        this.chain = new Chain()
        this.callbacks = new Map()
        this.activeServices = new Map()
        this.cmdBuilder = new CommandBuilder()

        this.chain.use(new HandleCmdBuilder<TContext>)
        this.chain.use(new HandleHelpCmd<TContext>)
        this.chain.use(new HandleAccountCommand<TContext>)
        this.chain.use(new HandleServiceCommand<TContext>)
        this.chain.use(new HandleSequenceCommand<TContext>)
        this.chain.use(new HandleCallbackExecution<TContext>)
    }

    done() {
        if (!validateWithNeighborsMap(this.callbacks)) {
            throw new Error("CommandHandler::done() invalid callbacks map");
        }

        const targets: string[] = Array.from(this.callbacks.keys())
        const naighbors: ICmdCallback<TContext>[] = Array.from(this.callbacks.values())
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

    public registerMany(commands: ICmdRegisterMany<TContext>) {
        commands.forEach(cmd => this.register(cmd.command, cmd.mixin))
    }

    public register(command: ICmdHandlerCommand, mixin: ICmdMixin<TContext>) {
        if (command.command in this.callbacks) {
            throw new Error("CommandHandler.register() command already registered: " + command.command);
        }
        if (BuiltInUICmdArray.map(c => c.command).includes(command.command)) {
            throw new Error("CommandHandler.register() command already registered as default: " + command.command);
        }
        this.callbacks.set(
            command.command,
            {
                fn: mixin,
                description: command.description,
                args: command.args,
                next: command.next,
                prev: command.prev
            }
        );
    }
    
    get SequenceHandler() {
        return this.sequenceHandler!
    }

    get CommandBuilder() {
        return this.cmdBuilder
    }

    get ActiveServices() {
        return this.activeServices
    }

    UserServices(userId: string) {
        const s = this.activeServices.get(userId)
        if (!s) {
            this.activeServices.set(userId, [])
        }
        return s as Array<BaseCommandService<any, any, any>>
    }

    isServiceActive(userId: string, serviceName: string) {
        const services = this.activeServices.get(userId)
        if (!services) {
            return false
        }
        return services.map(s => s.name).includes(serviceName)
    }

    isAllArgsPassed(command: string, args: string[]): boolean {
        if (this.isBuiltInCommand(command)) {
            const requiredArgs =  BuiltInUICmdArray.find(c => c.command === command)?.args?.filter(a => !a.optional)
            if (!requiredArgs || requiredArgs.length === 0) {
                return true
            }
            return isEqual(requiredArgs.map(a => a.name), args)
        }

        const cmd = this.callbacks.get(command)
        if (!cmd) {
            return true // maybe dispatch exception?
        }
        if (cmd.fn instanceof Function) {
            if (!cmd.args || cmd.args.length === 0) {
                return true
            }
            const requiredArgs = cmd.args.filter(a => !a.optional)
            return isEqual(requiredArgs.map(a => a.name), args)
        } else {
            // services always neet to be configured
            return false
        }
    }

    isBuiltInCommand(command: string) {
        return BuiltInUICmdArray.map(c => c.command).includes(command)
    }

    getCallbackFromCommandName(command: string): ICmdCallback<TContext> {
        const cb = this.callbacks.get(command)
        if (!cb) {
            throw {
                success: false,
                text: `Command ${command} not found.`
            }
        }
        return cb as ICmdCallback<TContext>
    }

    public async execute(userId: string, command: string, args: IArgReadResult[], ctx: TContext) {
        const cb = this.getCallbackFromCommandName(command)
        if (cb.fn instanceof Function) {
            return await this.runFunction(userId, command, args, ctx)
        } else {
            return await this.runService(userId, command, args, ctx)
        }
    }

    public async handleCommand(command: string, ctx: TContext): Promise<ICmdHandlerExecResult> {
        const args = this.getArgs(ctx.text!)
        const _userId = ctx.manager?.userId

        if (!_userId) {
            return {
                success: false,
                text: "No user id."
            }
        }

        return await this.chain.handle({
            currentCmdHandler: this,
            command: command,
            userId: String(_userId),
            args,
            uiCtx: ctx
        })
    }

    private async runFunction(_: string, command: string, args: IArgReadResult[], ctx: TContext) {
        const cb = this.getCallbackFromCommandName(command)

        try {
            const _args = args.filter(a => a.ctx === "args" && a.value).map(a => a.value) as string[]
            console.log(args)
            console.log(_args)
            const res = await (cb.fn as ICmdFunction<TContext>)(_args, ctx)
            if (res && res.error) {
                return {
                    success: false,
                    text: `Execution failed: ${res.error}`
                }
            } else {
                return {
                    success: true,
                    text: `Execution success`
                }
            }
        } catch (e: any) {
            if ('success' in e) {
                return e as ICmdHandlerExecResult
            }
            return {
                success: false,
                text: `Command execution error: ${anyToString(e)}`
            }
        }
    }

    private async runService(userId: string, serviceName: string, args: IArgReadResult[], ctx: TContext) {
        if (this.isServiceActive(userId, serviceName)) {
            return {
                success: false,
                text: `Service ${serviceName} already active.`
            }
        }

        const cb = this.getCallbackFromCommandName(serviceName)
        if (!cb || (cb.fn instanceof Function)) {
            return {
                success: false,
                text: `Service ${serviceName} not found.`
            }
        }
        const exe = cb.fn as ICmdService

        const _conf = args.filter(a => a.ctx === 'config')
        let conf = {}
        for (const c of _conf) {
            conf = Object.assign(conf, { [c.name]: c.value })
        }

        const _params = args.filter(a => a.ctx === "params")
        const params = []
        for (const p of _params) {
            params.push(p.name)
            if (p.value) {
                params.push(p.value)
            }
        }
        const serviceInstance = exe.clone(userId, params, conf)

        const userServices = this.UserServices(userId)

        serviceInstance.on("message", async (message: string) => {
            await ctx.reply(message)
        })
        serviceInstance.on('done', async (msg: string = "") => {
            const services = this.activeServices.get(userId)
            if (!services) {
                log.error(`No active services for user ${userId}`)
                return
            }
            services.splice(services!.map(serv => serv.name).indexOf(serviceName), 1)
            log.echo("-- Service done: " + serviceName)
            await ctx.reply(`Service ${serviceName} done. ${msg}`)
        })
        log.echo("-- Starting service: " + serviceInstance.name)

        try {
            await serviceInstance.Initialize()
            userServices.push(serviceInstance)
            serviceInstance.run()
        } catch(e: any) {
            log.error(`Error starting service ${serviceName}: ${anyToString(e)}`)
            return {
                success: false,
                text: `Error starting service ${serviceName}: ${anyToString(e)}` 
            }
        }
        return {
            success: true,
            text: `Service ${serviceName} started.`
        }
    }

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }

    public mapHandlersToUICommands(): IUICommandSimple[] {
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

        return BuiltInUICmdArray.concat(registredCmds).concat(DefaultTgUICommands)
    }
}

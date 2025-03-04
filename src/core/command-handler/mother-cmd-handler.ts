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
    ICmdRegisterMany
} from "./types";
import { CommandBuilder } from "./command-builder";
import { HandleAccountCommand, HandleCallbackExecution, HandleCmdBuilder, HandleHelpCmd, HandleSequenceCommand, HandleServiceCommand } from "./handlers";
import { isEqual } from "@core/utils/array";

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

    getCallbackFromCommandName(command: string) {
        return this.callbacks.get(command)
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

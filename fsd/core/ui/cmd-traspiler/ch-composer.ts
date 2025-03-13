import { WithInit } from "@core/types/with-init";
import { validateWithNeighborsMap } from "@core/types/with-neighbors";
import { BaseUIContext } from "@core/ui/types";

import logger from '@logger';

import { SequenceHandler } from "./sequence-handler";
import { BaseCommandService } from "@core/ui/types/command/service";

import { Chain } from "@core/utils/chain";
import {
    IComposerUICmdCallback,
    IHandleCommandResult,
    ICmdRegisterManyEntry,
    ICmdRegisterEntry,
} from "./types";
import { CommandBuilder } from "./builder";
import { HandleCallbackExecution, HandleCmdBuilder, HandleSequenceCommand } from "./handlers";
import { isContainsAll } from "@core/utils/array";
import { anyToString } from "@core/utils/misc";
import { Account, IAccountSession, Manager } from "@core/db";
import { CmdArgumentMeta, getCmdArgMetadata, isFunc, isService, IUICommandProcessed } from "@core/ui/types/command";

import {
    SetVariableCommand,
    GetVariableCommand,
    RemoveVariableCommand,

    ServiceStopCommand,
    ServiceRunCommand,
    ServiceSendMsgCommand,

    NextInSeqCommand,
    BackInSeqCommand,
    CancelSeqCommand,

    ConcreetHelp,
    CommonHelp,

    AliasCommand,
    UnaliasCommand,
    ListAliases
} from "./built-in-cmd";

import 'reflect-metadata'

import { BuiltInCommandNames, toRegister } from "./built-in-cmd";
import { CommandInvoker } from "./invoker"
import { UiUnicodeSymbols } from "@core/ui";
import { HandleCommandAlias } from "./handlers/alias";
import { ICommandHandlerChain } from "./handlers/abstract-handler";

// TODO split to service manager
export class CHComposer<UIContextType extends BaseUIContext> extends WithInit {
    private activeServices: Map<string, Array<BaseCommandService<any>>> // userId -> services
    private callbacks: Map<string, IComposerUICmdCallback<UIContextType>> // command -> callback

    private sequenceHandler?: SequenceHandler
    private cmdBuilder: CommandBuilder
    private cmdInvoker: CommandInvoker<UIContextType>

    private chain: ICommandHandlerChain<UIContextType>

    constructor() {
        super()
        this.chain = new Chain()
        this.callbacks = new Map()
        this.activeServices = new Map()
        this.cmdBuilder = new CommandBuilder()
        this.cmdInvoker = new CommandInvoker(this)

        this.chain.use(new HandleCommandAlias<UIContextType>)
        this.chain.use(new HandleCmdBuilder<UIContextType>)
        this.chain.use(new HandleSequenceCommand<UIContextType>)
        this.chain.use(new HandleCallbackExecution<UIContextType>)
    }

    public async handleCommand(command: string, ctx: UIContextType): Promise<IHandleCommandResult> {
        const args = this.getArgs(ctx.text!)
        const _userId = ctx.manager?.userId

        if (!_userId) {
            return {
                success: false,
                markup: {
                    text: ` ${UiUnicodeSymbols.error} No user id.`,
                }
            }
        }

        try {
            console.log(`"-----------`)
            console.log(ctx.text)
            console.log(`-----------"`)
            return await this.chain.handle({
                composer: this,
                command: command,
                text: ctx.text!,
                userId: String(_userId),
                ownerId: String(ctx.manager!._id),
                args,
                uiCtx: ctx
            })
        } catch(e: any) {
            log.error(anyToString(e))
            return {
                success: false,
                markup: {
                    text: ` ${UiUnicodeSymbols.error} Command handling error:\n -- ${anyToString(e)}`
                }
            }
        }
    }

    public registerMany(entries: ICmdRegisterManyEntry<UIContextType>) {
        entries.forEach(entry => this.register(entry))
    }

    public register({command, callback}: ICmdRegisterEntry<UIContextType>) {
        if (this.isInitialized()) {
            throw new Error("Not permitted to register command after init");
        }

        this.validateCmdName(command.command)
        this.registerWrapper({command, callback})
    }

    /**
    * @description All command registred with this method not allowed to use in sequence
    */
    unBoundRegister({command, callback}: ICmdRegisterEntry<UIContextType>) {
        this.validateCmdName(command.command)
        this.registerWrapper({command, callback}, false)
    }

    private validateCmdName(command: string) {
        if (command in this.callbacks) {
            throw new Error("CommandHandler.register() command already registered: " + command);
        }
        //if (BuiltInCommandNames.includes(command)) {
        //    throw new Error("CommandHandler.register() command already registered as default: " + command);
        //}
    }

    private registerWrapper({command, callback}: ICmdRegisterEntry<UIContextType>, bounded = true) {
        let argsDesc: (CmdArgumentMeta&{name: string})[] = []
        if (command.args) {
            const _args = command.args
            const metaArg = getCmdArgMetadata<any>(_args)
            for (const key in metaArg) {
                const arg = metaArg[key]
                argsDesc.push({
                    ...arg,
                    name: key
                })
            }
        }

        this.callbacks.set(
            command.command,
            {
                callback: callback,
                description: command.description,
                args: argsDesc,
                next: command.next,
                prev: command.prev,
                seqBounded: bounded
            },
        );
    }

    done() {
        this.registerMany([
            toRegister(SetVariableCommand as any, this),
            toRegister(RemoveVariableCommand as any, this),
            toRegister(GetVariableCommand as any, this),

            toRegister(ServiceStopCommand as any, this),
            toRegister(ServiceRunCommand as any, this),
            toRegister(ServiceSendMsgCommand as any, this),

            toRegister(NextInSeqCommand as any, this),
            toRegister(BackInSeqCommand as any, this),
            toRegister(CancelSeqCommand as any, this),

            toRegister(ConcreetHelp as any, this),
            toRegister(CommonHelp as any, this),

            toRegister(AliasCommand as any, this),
            toRegister(UnaliasCommand as any, this),
            toRegister(ListAliases as any, this),
        ])

        const cbNames = this.callbacks.keys().toArray()
        if (!isContainsAll(cbNames, BuiltInCommandNames)) {
            throw new Error("CommandHandler::done() not all built-in commands registered");
        }

        if (!validateWithNeighborsMap(this.callbacks)) {
            throw new Error("CommandHandler::done() invalid callbacks map");
        }

        const targets: string[] = Array.from(this.callbacks.keys())
        const naighbors: IComposerUICmdCallback<UIContextType>[] = Array.from(this.callbacks.values())
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

    async stopAllServices() {
        for (const [userId, services] of this.activeServices) {
            log.info(" -- Stoping services for user: " + userId)
            const terminatePromises = []
            for (const s of services) {
                log.info("  -- terminating service: " + s.name)
                await s.terminate()
                terminatePromises.push(
                    new Promise(resolve => s.on("done", resolve))
                )
            }
            await Promise.all(terminatePromises)
            log.info("  -- All services for user: " + userId + " stopped")
        }
        log.info(" -- All services stopped")
    }

    async terminateService(userId: string, serviceName: string) {
        if (!this.isServiceActive(userId, serviceName)) {
            throw `Service ${serviceName} of user ${userId} not active`
        }

        const services = this.UserActiveServices(userId)
        try {
            await services.find(serv => serv.name === serviceName)!.terminate()
        } catch (e: any) {
            throw `Service ${serviceName} terminate error: ${anyToString(e)}`
        }
        this.RemoveUserAcitveService(userId, serviceName)
    }

    public isService(name: string): boolean {
        const cb = this.getCallbackFromCommandName(name)
        if (!cb) {
            log.debug(`Trying check callback type for command "${name}" but command not found.`)
            return false
        }
        return isService(cb.callback)
    }

    isAllArgsPassed(command: string, passedArgs: string[]): boolean {
        const cmd = this.callbacks.get(command)
        if (!cmd) {
            log.error(`While processing command "${command}" passed arguments, command not found`)
            return true // maybe dispatch exception?
        }
        if (isFunc(cmd.callback)) {
            if (!cmd.args || cmd.args.length === 0) {
                return true
            }

            const requiredArgs = cmd.args.filter(a => a.required)
            return passedArgs.length >= requiredArgs.length
        } else {
            // services always neet to be configured ?
            return false
        }
    }

    isBuiltInCommand(command: string) {
        return BuiltInCommandNames.includes(command)
    }

    isCommandRegistered(command: string) {
        return this.callbacks.has(command)
    }

    get CommandInvoker() {
        return this.cmdInvoker
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

    UserActiveServices(userId: string): Array<BaseCommandService<any>> {
        const s = this.activeServices.get(userId)
        if (!s) {
            this.activeServices.set(userId, [])
        }
        return this.activeServices.get(userId)!
    }

    RemoveUserAcitveService(userId: string, serviceName: string) {
        const s = this.activeServices.get(userId)
        if (!s) {
            throw `User "${userId}" active services store not initialized`
        }
        const instance = s.find(serv => serv.name === serviceName)
        if (!instance) {
            throw `User "${userId}" active service "${serviceName}" not found`
        }
        s.splice(s.indexOf(instance), 1)
    }

    async UserServiceSessions(userId: string, serviceName: string): Promise<string[]> {
        const cmd = this.getCallbackFromCommandName(serviceName)
        if (isFunc(cmd.callback)) {
            return []
        } else {
            const owner = await Manager.findOne({userId})
            if (!owner) {
                return []
            }
            const account = await Account.findOne({owner_id: owner._id})
            if (!account) {
                return []
            }

            const data_module = await account.getModuleByName(serviceName)
            if (!data_module) {
                return []
            }

            const sessions = (await data_module.populate<{session_ids: IAccountSession[]}>('session_ids')).session_ids
            
            return sessions.map(s => s.name)
        }
    }

    isServiceActive(userId: string, serviceName: string) {
        const services = this.activeServices.get(userId)
        if (!services) {
            return false
        }
        return services.map(s => s.name).includes(serviceName)
    }

    getCallbackFromCommandName(command: string): IComposerUICmdCallback<UIContextType> {
        const cb = this.callbacks.get(command)
        if (!cb) {
            log.error(`Command ${UiUnicodeSymbols.arrowRight} "${command}" not found.`)
            throw `Command ${UiUnicodeSymbols.arrowRight} "${command}" not found.`
        }
        return cb!
    }

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }

    public getRegistredServiceNames(): string[] {
        let ret: string[] = []
        this.callbacks.forEach((v) => {
            if (isService(v.callback)) {
                ret.push(v.callback.name)
            }
        })
        return ret
    }

    public getRegistredCommandNames(): string[] {
        let ret: string[] = []
        for (const [key, value] of this.callbacks) {
            if (isFunc(value.callback)) {
                ret.push(key)
            }
        }
        return ret
    }

    public toUICommands(): IUICommandProcessed[] {
        let commands = this.callbacks.keys().toArray()
        const cmd_descriptions = this.callbacks.values().map(v => v.description).toArray()
        const cmd_args = this.callbacks.values().map(v => v.args).toArray()

        const registredCmds: IUICommandProcessed[] = new Array(commands.length).fill(0).map(
            (_, i) => ({
                command: commands[i],
                description: cmd_descriptions[i],
                args: cmd_args[i]
            })
        )

        return registredCmds
    }

    public debug() {
        for (const [name, cb] of this.callbacks) {
            name;
            console.log(`${name}:`, cb)
        }
    }
    }

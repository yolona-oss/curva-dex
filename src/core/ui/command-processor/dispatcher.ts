import { WithInit } from "@core/types/with-init";
import { validateWithNeighborsMap } from "@core/types/with-neighbors";
import { BaseUIContext } from "@core/ui/types";

import log from '@logger';

import { CommandSequenceHandler } from "./sequence-handler";
import { BaseCommandService } from "@core/ui/types/command/service";

import { Chain } from "@core/utils/chain";
import {
    IUICommandEntry,
    IHandleResult,
    ICmdRegisterManyEntry,
    ICmdRegisterEntry,
} from "./types";
import { CommandBuilder } from "./builder";
import {
    HandleInvokation,
    HandleCmdBuilder,
    HandleSequenceCommand
} from "./handlers";
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
export class CmdDispatcher<UIContextType extends BaseUIContext> extends WithInit {
    private active_services: Map<string, Array<BaseCommandService<any>>> // userId -> services
    private cmd_registry: Map<string, IUICommandEntry<UIContextType>> // command -> invokable

    /** Sequence handler need to now about all neighbors of commands to initialize,
     * because it will be initialized in this.done() */
    private sequenceHandler!: CommandSequenceHandler
    private cmdBuilder: CommandBuilder
    private cmdInvoker: CommandInvoker<UIContextType>
    private chain: ICommandHandlerChain<UIContextType>

    constructor() {
        super()
        this.chain = new Chain()
        this.cmd_registry = new Map()
        this.active_services = new Map()
        this.cmdBuilder = new CommandBuilder()
        this.cmdInvoker = new CommandInvoker(this)

        this.chain.use(new HandleCommandAlias<UIContextType>)
        this.chain.use(new HandleCmdBuilder<UIContextType>)
        this.chain.use(new HandleSequenceCommand<UIContextType>)
        this.chain.use(new HandleInvokation<UIContextType>)
    }

    public async handleCommand(command: string, userText: string, ctx: UIContextType): Promise<IHandleResult> {
        const args = this.getArgs(userText)
        const _userId = ctx.manager?.userId

        if (!_userId) {
            return {
                success: false,
                markup: {
                    text: ` ${UiUnicodeSymbols.error} No user id.`,
                }
            }
        }

        command = command.split(" ")[0]
        try {
            return await this.chain.handle({
                dispatcher: this,
                command: command,
                text: userText,
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
                    text: `${UiUnicodeSymbols.error} Command handling chain failed:\n ${anyToString(e)}`
                }
            }
        }
    }

    public registerMany(entries: ICmdRegisterManyEntry<UIContextType>) {
        entries.forEach(entry => this.register(entry))
    }

    public register({command, invokable}: ICmdRegisterEntry<UIContextType>) {
        if (this.isInitialized()) {
            throw new Error("Not permitted to register command after init");
        }

        this.validateCmdName(command.command)
        this.registerWrapper({command, invokable})
    }

    /**
    * @description All command registred with this method not allowed to use in sequence
    */
    unBoundRegister({command, invokable}: ICmdRegisterEntry<UIContextType>) {
        this.validateCmdName(command.command)
        this.registerWrapper({command, invokable}, false)
    }

    private validateCmdName(command: string) {
        if (command in this.cmd_registry) {
            throw new Error("CommandHandler.register() command already registered: " + command);
        }
        //if (BuiltInCommandNames.includes(command)) {
        //    throw new Error("CommandHandler.register() command already registered as default: " + command);
        //}
    }

    private registerWrapper({command, invokable}: ICmdRegisterEntry<UIContextType>, bounded = true) {
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

        this.cmd_registry.set(
            command.command,
            {
                invokable: invokable,
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

        const cbNames = this.cmd_registry.keys().toArray()
        if (!isContainsAll(cbNames, BuiltInCommandNames)) {
            throw new Error("CommandHandler::done() not all built-in commands registered");
        }

        if (!validateWithNeighborsMap(this.cmd_registry)) {
            throw new Error("CommandHandler::done() invalid invokables map");
        }

        const targets: string[] = Array.from(this.cmd_registry.keys())
        const naighbors: IUICommandEntry<UIContextType>[] = Array.from(this.cmd_registry.values())
        this.sequenceHandler = new CommandSequenceHandler(
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
        for (const [userId, services] of this.active_services) {
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
            throw `Service "${serviceName}" of user ${userId} not active`
        }

        const services = this.UserActiveServices(userId)
        try {
            await services.find(serv => serv.name === serviceName)!.terminate()
        } catch (e) {
            log.error(`Cannot terminate service "${serviceName}" for user "${userId}": ${anyToString(e)}`)
            throw `Service "${serviceName}" terminate error: ${anyToString(e)}`
        }
    }

    public isService(name: string): boolean {
        const cb = this.getInvokable(name)
        if (!cb) {
            log.debug(`Trying check invokable type for command "${name}" but command not found.`)
            return false
        }
        return isService(cb.invokable)
    }

    isAllArgsPassed(command: string, passedArgs: string[]): boolean {
        const cmd = this.cmd_registry.get(command)
        if (!cmd) {
            log.error(`While processing command "${command}" with passed arguments "${passedArgs.join(", ")}", command not found`)
            return true // maybe dispatch exception?
        }
        if (isFunc(cmd.invokable)) {
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
        return this.cmd_registry.has(command)
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
        return this.active_services
    }

    UserActiveServices(userId: string): Array<BaseCommandService<any>> {
        const s = this.active_services.get(userId)
        if (!s) {
            this.active_services.set(userId, [])
        }
        return this.active_services.get(userId)!
    }

    RemoveUserAcitveService(userId: string, serviceName: string) {
        const s = this.UserActiveServices(userId)
        const instance = s.find(serv => serv.name === serviceName)
        if (!instance) {
            throw `No active service "${serviceName}" for user "${userId}" `
        }
        s.splice(s.indexOf(instance), 1)
    }

    async UserServiceSessions(userId: string, serviceName: string): Promise<string[]> {
        const cmd = this.getInvokable(serviceName)
        if (isFunc(cmd.invokable)) {
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
        const services = this.active_services.get(userId)
        if (!services) {
            return false
        }
        return services.map(s => s.name).includes(serviceName)
    }

    getInvokable(command: string): IUICommandEntry<UIContextType> {
        const cb = this.cmd_registry.get(command)
        if (!cb) {
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
        this.cmd_registry.forEach((v) => {
            if (isService(v.invokable)) {
                ret.push(v.invokable.name)
            }
        })
        return ret
    }

    public getRegistredCommandNames(): string[] {
        let ret: string[] = []
        for (const [key, value] of this.cmd_registry) {
            if (isFunc(value.invokable)) {
                ret.push(key)
            }
        }
        return ret
    }

    public toUICommands(): IUICommandProcessed[] {
        let commands = this.cmd_registry.keys().toArray()
        const cmd_descriptions = this.cmd_registry.values().map(v => v.description).toArray()
        const cmd_args = this.cmd_registry.values().map(v => v.args).toArray()

        const registredCmds: IUICommandProcessed[] = new Array(commands.length).fill(0).map(
            (_, i) => ({
                command: commands[i],
                description: cmd_descriptions[i],
                args: cmd_args[i]
            })
        )

        return registredCmds
    }

}

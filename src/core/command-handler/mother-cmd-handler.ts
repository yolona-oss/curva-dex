import { WithInit } from "@core/types/with-init";
import { validateWithNeighborsMap } from "@core/types/with-neighbors";
import { BaseUIContext, IUICommandSimple } from "@core/ui/types";

import log from '@utils/logger'

import { SequenceHandler } from "./sequence-handler";
import { BaseCommandService } from "./command-service";

import { Chain } from "@core/utils/chain";
import {
    ICommandHandlerChain,
    ICmdCallback,
    ICmdHandlerCommand,
    ICmdHandlerExecResult,
    ICmdMixin,
    ICmdRegisterManyEntry,
    IBuilderCmdArgReadResult,
    ICmdService,
    ICmdFunction
} from "./types";
import { CommandBuilder } from "./command-builder";
import { HandleCallbackExecution, HandleCmdBuilder, HandleSequenceCommand } from "./handlers";
import { isContainsAll, isEqual_Deep } from "@core/utils/array";
import { anyToString } from "@core/utils/misc";
import { Account, Manager } from "@core/db";
import { BLANK_SERVICE_SESSION_ID, MODULE_SESSION_ID_MARK } from "./constants";
import { ServiceData } from "./service-data";
import { BaseCommandArgumentDesc, getCmdArgMetadata, IUICommandProcessed } from "@core/ui/types/command";

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
} from "./built-in-cmd";

import 'reflect-metadata'

import { BuiltInCommandNames, toRegister } from "./built-in-cmd";

// NOTE: ITS TEMPORARY. ITS WILL BE REMOVED TO ANOTHER IMPL
type WaitingUserInputType = "builderDeligate" | null

// TODO RENAME IT!!! and split
export class MotherCmdHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, ICmdCallback<TContext>> // name -> callback
    private sequenceHandler?: SequenceHandler
    /**
     * @description Per user active services
     */
    private activeServices: Map<string, Array<BaseCommandService<any>>> // userId -> services
    private cmdBuilder: CommandBuilder

    private chain: ICommandHandlerChain<TContext>

    constructor() {
        super()
        this.chain = new Chain()
        this.callbacks = new Map()
        this.activeServices = new Map()
        this.cmdBuilder = new CommandBuilder()

        this.chain.use(new HandleCmdBuilder<TContext>)
        this.chain.use(new HandleSequenceCommand<TContext>)
        this.chain.use(new HandleCallbackExecution<TContext>)
    }

    done() {
        this.registerMany([
            toRegister<TContext>(SetVariableCommand as any, this),
            toRegister<TContext>(RemoveVariableCommand as any, this),
            toRegister<TContext>(GetVariableCommand as any, this),

            toRegister<TContext>(ServiceStopCommand as any, this),
            toRegister<TContext>(ServiceRunCommand as any, this),
            toRegister<TContext>(ServiceSendMsgCommand as any, this),

            toRegister<TContext>(NextInSeqCommand as any, this),
            toRegister<TContext>(BackInSeqCommand as any, this),
            toRegister<TContext>(CancelSeqCommand as any, this),

            toRegister<TContext>(ConcreetHelp as any, this),
            toRegister<TContext>(CommonHelp as any, this),
        ])

        const cbNames = this.callbacks.keys().toArray()
        if (!isContainsAll(cbNames, BuiltInCommandNames)) {
            throw new Error("CommandHandler::done() not all built-in commands registered");
        }

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

    public registerMany(commands: ICmdRegisterManyEntry<TContext>) {
        commands.forEach(cmd => this.register(cmd.command, cmd.mixin))
    }

    public register(command: ICmdHandlerCommand, mixin: ICmdMixin<TContext>) {
        if (this.isInitialized()) {
            throw new Error("Not permitted to register command after init");
        }

        this.validateCmdName(command.command)
        this.registerWrapper(command, mixin)
    }

    /**
    * @description All command registred with this method not allowed to use in sequence
    */
    unBoundRegister(command: ICmdHandlerCommand, mixin: ICmdMixin<TContext>) {
        this.validateCmdName(command.command)
        this.registerWrapper(command, mixin, false)
    }

    private validateCmdName(command: string) {
        if (command in this.callbacks) {
            throw new Error("CommandHandler.register() command already registered: " + command);
        }
        //if (BuiltInCommandNames.includes(command)) {
        //    throw new Error("CommandHandler.register() command already registered as default: " + command);
        //}
    }

    private registerWrapper(command: ICmdHandlerCommand, mixin: ICmdMixin<TContext>, bounded = true) {
        let argsDesc: (BaseCommandArgumentDesc&{name: string})[] = []
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
                execMixin: mixin,
                description: command.description,
                args: argsDesc,
                next: command.next,
                prev: command.prev,
                seqBounded: bounded
            },
        );
    }

    WaitingInputFromUser(userId: string): WaitingUserInputType {
        if (this.cmdBuilder.isUserOnBuild(userId)) {
            return "builderDeligate"
        } else {
            return null
        }
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
        return s!
    }

    RemoveUserAcitveService(userId: string, serviceName: string) {
        const s = this.activeServices.get(userId)
        if (!s) {
            throw `User ${userId} active services store not initialized`
        }
        const instance = s.find(serv => serv.name === serviceName)
        if (!instance) {
            throw `User ${userId} active service ${serviceName} not found`
        }
        s.splice(s.indexOf(instance), 1)
    }

    async UserServiceSessions(userId: string, serviceName: string): Promise<string[]> {
        const cb = this.getCallbackFromCommandName(serviceName)
        if (cb.execMixin instanceof Function) {
            return []
        } else {
            const blank = BLANK_SERVICE_SESSION_ID
            const m = await Manager.findOne({ userId })
            const a = await Account.findOne({ _id: m!.account })
            const session_modules_names = await a?.getLinkedModules(serviceName)
            
            if (!session_modules_names || !a) {
                return [blank]
            }

            const session_ids: string[] = []
            for (const name of session_modules_names) {
                const split = a.splitModuleName(name)
                for (const s of split) {
                    if (s.startsWith(MODULE_SESSION_ID_MARK)) {
                        session_ids.push(s.slice(MODULE_SESSION_ID_MARK.length))
                    }
                }
            }

            if (!session_ids.includes(blank)) {
                session_ids.push(blank)
            }

            return session_ids
        }
    }

    isServiceActive(userId: string, serviceName: string) {
        const services = this.activeServices.get(userId)
        if (!services) {
            return false
        }
        return services.map(s => s.name).includes(serviceName)
    }

    isAllArgsPassed(command: string, passedArgs: string[]): boolean {
        const cmd = this.callbacks.get(command)
        if (!cmd) {
            log.error(`While processing command "${command}" passed arguments, command not found`)
            return true // maybe dispatch exception?
        }
        if (cmd.execMixin instanceof Function) {
            if (!cmd.args || cmd.args.length === 0) {
                return true
            }

            const requiredArgs = cmd.args.filter(a => a.required)
            const requiredArgNames = requiredArgs.map(a => a.name)
            return passedArgs.length >= requiredArgs.length
            //console.log("Required VVV")
            //console.log(requiredArgNames)
            //console.log("Passed VVV")
            //console.log(passedArgs)
            //return isEqual_Deep(requiredArgNames, passedArgs)
        } else {
            // services always neet to be configured
            return false
        }
    }

    isBuiltInCommand(command: string) {
        return BuiltInCommandNames.includes(command)
    }

    getCallbackFromCommandName(command: string): ICmdCallback<TContext> {
        const cb = this.callbacks.get(command)
        if (!cb) {
            log.debug(`${this.constructor.name}::getCallbackFromCommandName Command "${command}" not found`)
            throw {
                success: false,
                text: `Command "${command}" not found.`
            }
        }
        return cb as ICmdCallback<TContext>
    }

    public async terminateService(userId: string, serviceName: string) {
        if (!this.isServiceActive(userId, serviceName)) {
            throw `Service ${serviceName} of user ${userId} not active`
        }

        const services = this.activeServices.get(userId)!
        try {
            await services.find(serv => serv.name === serviceName)!.terminate()
        } catch (e: any) {
            throw `Service ${serviceName} terminate error: ${anyToString(e)}`
        }
        this.RemoveUserAcitveService(userId, serviceName)
    }

    public async execute(userId: string, command: string, args: IBuilderCmdArgReadResult[], ctx: TContext) {
        const cb = this.getCallbackFromCommandName(command)
        if (cb.execMixin instanceof Function) {
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

        try {
            return await this.chain.handle({
                currentCmdHandler: this,
                command: command,
                userId: String(_userId),
                args,
                uiCtx: ctx
            })
        } catch(e: any) {
            if (e && typeof e === 'object' && 'success' in e) {
                return e as ICmdHandlerExecResult
            }
            log.error(e)
            return {
                success: false,
                text: `Command handling error: ${anyToString(e)}`
            }
        }
    }

    private async runFunction(_: string, command: string, args: IBuilderCmdArgReadResult[], ctx: TContext) {
        const cb = this.getCallbackFromCommandName(command)

        try {
            const _args = args.filter(a => a.ctx === "args" && a.value).map(a => a.value) as string[]
            const exec = cb.execMixin as ICmdFunction<TContext>
            if (this.isBuiltInCommand(command)) {
                exec.bind(this)
            }
            const res = await exec(_args, ctx)
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
            if (e && typeof e === 'object' && 'success' in e) {
                return e as ICmdHandlerExecResult
            }
            return {
                success: false,
                text: `Command execution error: ${anyToString(e)}`
            }
        }
    }

    private async runService(userId: string, serviceName: string, args: IBuilderCmdArgReadResult[], ctx: TContext) {
        if (this.isServiceActive(userId, serviceName)) {
            return {
                success: false,
                text: `Service ${serviceName} already active.`
            }
        }

        const cb = this.getCallbackFromCommandName(serviceName)
        if (!cb || (cb.execMixin instanceof Function)) {
            return {
                success: false,
                text: `Service ${serviceName} not found.`
            }
        }
        const exe = cb.execMixin as ICmdService

        const _conf = args.filter(a => a.ctx === 'config')
        let conf = {}
        for (const c of _conf) {
            conf = Object.assign(conf, { [c.name]: c.value })
        }

        const _params = args.filter(a => a.ctx === "params")
        let params = {}
        for (const p of _params) {
            params = Object.assign(conf, { [p.name]: p.value })
        }

        const _msgs = args.filter(a => a.ctx === "message")
        let messages = {}
        for (const m of _msgs) {
            messages = Object.assign(conf, { [m.name]: m.value })
        }

        new ServiceData(conf as any, params as any, messages as any)
        const serviceInstance = exe.clone(userId, undefined)

        const userServices = this.UserActiveServices(userId)

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
            log.info("-- Service done: " + serviceName)
            await ctx.reply(`Service ${serviceName} done. ${msg}`)
        })
        log.info("-- Starting service: " + serviceInstance.name)

        try {
            await serviceInstance.Initialize()
            userServices.push(serviceInstance)
            serviceInstance.run()
            return {
                success: true,
                text: `Service ${serviceName} started.`
            }
        } catch(e: any) {
            log.error(`Error starting service ${serviceName}: ${anyToString(e)}`, e)
            return {
                success: false,
                text: `Error starting service ${serviceName}: ${anyToString(e)}` 
            }
        }
    }

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }

    public isService(name: string): boolean {
        const cb = this.getCallbackFromCommandName(name)
        if (!cb) {
            return false
        }
        return cb.execMixin instanceof BaseCommandService
    }

    public getRegistredServiceNames(): string[] {
        let ret: string[] = []
        this.callbacks.forEach((v) => {
            if (v.execMixin instanceof BaseCommandService) {
                ret.push(v.execMixin.name)
            }
        })
        return ret
    }

    public getRegistredCommandNames(): string[] {
        let ret: string[] = []
        this.callbacks.forEach((v) => {
            if (v.execMixin instanceof Function) {
                ret.push(v.execMixin.name)
            }
        })
        return ret
    }

    public mapHandlersToUICommands(): IUICommandProcessed[] {
        let cmd = this.callbacks.keys().toArray()
        const desc = this.callbacks.values().map(v => v.description).toArray()
        const args = this.callbacks.values().map(v => v.args).toArray()

        const registredCmds = new Array(cmd.length).fill(0).map(
            (_, i) => ({
                command: cmd[i],
                description: desc[i],
                args: args[i]
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

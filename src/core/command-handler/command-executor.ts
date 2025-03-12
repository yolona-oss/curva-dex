import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"
import { CHComposer } from "./ch-composer"
import { IBuilderCmdArgReadResult, ICmdFunction, ICmdService } from "./types"
import log from "@core/utils/logger"
import { anyToString } from "@core/utils/misc"

export class CommandExecutor<TContext extends BaseUIContext> {
    constructor(
        protected composer: CHComposer<TContext>,
    ) { }

    async execute(userId: string, command: string, args: IBuilderCmdArgReadResult[], ctx: TContext) {
        const cb = this.composer.getCallbackFromCommandName(command)
        if (cb.execMixin instanceof Function) {
            return await this.runFunction(userId, command, args, ctx)
        } else {
            return await this.runService(userId, command, args, ctx)
        }
    }

    async runFunction(_: string, command: string, readArgs: IBuilderCmdArgReadResult[], ctx: TContext) {
        const cb = this.composer.getCallbackFromCommandName(command)

        try {
            const commandArgs = readArgs.filter(a => a.ctx === "args" && a.value).map(a => a.value) as string[]
            const exec = cb.execMixin as ICmdFunction<TContext>
            if (this.composer.isBuiltInCommand(command)) {
                exec.bind(this.composer)
            }
            const res = await exec(commandArgs, ctx)
            if (res && res.error) {
                return {
                    success: false,
                    text: `${UiUnicodeSymbols.error} Execution failed: "${res.error ?? "unknown error"}"`
                }
            } else {
                return {
                    success: true,
                    text: `${UiUnicodeSymbols.success} Execution success`
                }
            }
        } catch (e: any) {
            return {
                success: false,
                text: `Command execution error:\n -- ${anyToString(e)}`
            }
        }
    }

    private transormfReadArgs(readArgs: IBuilderCmdArgReadResult[]) {
        const _conf = readArgs.filter(a => a.ctx === 'config')
        let config: any = {}
        for (const c of _conf) {
            config = Object.assign(config, { [c.name]: c.value })
        }

        const _params = readArgs.filter(a => a.ctx === "params")
        let params: any = {}
        for (const p of _params) {
            params = Object.assign(params, { [p.name]: p.value })
        }

        const _msgs = readArgs.filter(a => a.ctx === "message")
        let messages: any = {}
        for (const m of _msgs) {
            messages = Object.assign(messages, { [m.name]: m.value })
        }

        return {
            config,
            params,
            messages
        }
    }

    async runService(userId: string, serviceName: string, readArgs: IBuilderCmdArgReadResult[], ctx: TContext) {
        if (this.composer.isServiceActive(userId, serviceName)) {
            return {
                success: false,
                text: `Service ${serviceName} already active.`
            }
        }

        const cb = this.composer.getCallbackFromCommandName(serviceName)
        if (!cb || (cb.execMixin instanceof Function)) {
            return {
                success: false,
                text: `${UiUnicodeSymbols.magnifierGlass} Command service ${UiUnicodeSymbols.arrowRight} "${serviceName}" not found.`
            }
        }
        const exe = cb.execMixin as ICmdService

        const { config, params, messages } = this.transormfReadArgs(readArgs)

        const inputData = {
            config,
            params,
            messages
        }
        const serviceInstance = exe.clone(userId, inputData)

        const userServices = this.composer.UserActiveServices(userId)

        serviceInstance.on("message", async (message: string) => {
            await ctx.reply(message)
        })
        serviceInstance.on('done', async (msg: string = "") => {
            const services = this.composer.UserActiveServices(userId)
            if (!services) {
                log.error(`No active services for user ${userId}`)
                return
            }
            services.splice(services.map(serv => serv.name).indexOf(serviceName), 1)
            log.info("-- Service done: " + serviceName)
            await ctx.reply(` ${UiUnicodeSymbols.success} Service "${serviceName}" done. ${UiUnicodeSymbols.info} ${msg}`)
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
                text: `${UiUnicodeSymbols.error} Error starting service ${UiUnicodeSymbols.arrowRight} "${serviceName}":\n -- ${UiUnicodeSymbols.warning} ${anyToString(e)}` 
            }
        }
    }
}

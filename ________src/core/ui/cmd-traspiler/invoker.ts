import { BaseUIContext, ICmdFunction, ICmdService, ICommandCompiled, isFunc, UiUnicodeSymbols } from "@core/ui"
import { CHComposer } from "./ch-composer"
import { IArgumentCompiled } from "@core/ui/types"
import log from '@logger' "@core/utils/logger"
import { anyToString } from "@core/utils/misc"

const SEND_SUCCESS = false

export class CommandInvoker<TContext extends BaseUIContext> {
    constructor(
        protected composer: CHComposer<TContext>,
    ) { }

    async invoke(invokerId: string, cmdCompiled: ICommandCompiled, ctx: TContext) {
        const { command, args } = cmdCompiled
        const cb = this.composer.getCallbackFromCommandName(command)
        if (isFunc(cb.callback)) {
            return await this.invokeFunc(invokerId, command, args, ctx)
        } else {
            return await this.invokeService(invokerId, command, args, ctx)
        }
    }

    async invokeFunc(_: string, command: string, readArgs: IArgumentCompiled[], ctx: TContext) {
        const cb = this.composer.getCallbackFromCommandName(command)

        try {
            const commandArgs = readArgs.filter(a => a.ctx === "args" && a.value)
            const exec = cb.callback as ICmdFunction<TContext>
            if (this.composer.isBuiltInCommand(command)) {
                exec.bind(this.composer)
            }
            const res = await exec(commandArgs, ctx)
            if (res && res.error) {
                log.error(`Command "${command}" exec error: ${res.error}`)
                return {
                    success: false,
                    text: `${UiUnicodeSymbols.error} Execution failed: "${res.error ?? "unknown error"}"`
                }
            } else {
                log.error(`Command "${command}" exec success`)
                return {
                    success: true,
                    text: SEND_SUCCESS ? `${UiUnicodeSymbols.success} Execution success` : ""
                }
            }
        } catch (e: any) {
            log.error(`Command ${command} invokation error: ${anyToString(e)}\n`, e)
            return {
                success: false,
                text: `Command execution error:\n -- ${anyToString(e)}`
            }
        }
    }

    private compiledArgToInvokeArg(readArgs: IArgumentCompiled[]) {
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

    async invokeService(userId: string, serviceName: string, readArgs: IArgumentCompiled[], ctx: TContext) {
        if (this.composer.isServiceActive(userId, serviceName)) {
            return {
                success: false,
                text: `${UiUnicodeSymbols.warning} Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" already active.`
            }
        }

        const cb = this.composer.getCallbackFromCommandName(serviceName)
        if (!cb || (isFunc(cb.callback))) {
            return {
                success: false,
                text: `${UiUnicodeSymbols.error} Command service ${UiUnicodeSymbols.arrowRight} "${serviceName}" not found.`
            }
        }
        const exe = cb.callback as ICmdService

        const { config, params, messages } = this.compiledArgToInvokeArg(readArgs)

        const inputData = {
            config,
            params,
            messages
        }
        console.log(`----Invoke-args`)
        console.log(config)
        console.log(params)
        console.log(messages)

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
            await ctx.reply(` ${UiUnicodeSymbols.success} Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" done.\n -- ${UiUnicodeSymbols.info} ${msg}`)
        })
        log.info("-- Starting service: " + serviceInstance.name)

        try {
            await serviceInstance.Initialize()
            userServices.push(serviceInstance)
            serviceInstance.run()
            return {
                success: true,
                text: `Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" ${UiUnicodeSymbols.star} started.`
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

import { BaseUIContext, ICmdFunction, ICmdService, ICommandCompiled, isFunc, UiUnicodeSymbols } from "@core/ui"
import {CmdDispatcher } from "./dispatcher"
import { IArgumentCompiled } from "@core/ui/types"
import log from '@logger';
import { anyToString } from "@core/utils/misc"
import { IHandleResult } from "./types";

const SEND_SUCCESS = false

export class CommandInvoker<TContext extends BaseUIContext> {
    constructor(
        protected dispatcher: CmdDispatcher<TContext>,
    ) { }

    async invoke(invokerId: string, cmdCompiled: ICommandCompiled, ctx: TContext): Promise<IHandleResult> {
        log.trace(`Command invoker: Invoking command: ${cmdCompiled.command}, invoker: ${invokerId}`)
        const { command } = cmdCompiled
        const cb = this.dispatcher.getInvokable(command)
        if (isFunc(cb.invokable)) {
            return await this.invokeFunc(invokerId, cmdCompiled, ctx)
        } else {
            return await this.invokeService(invokerId, cmdCompiled, ctx)
        }
    }

    async invokeFunc(_: string, { command, proxy }: ICommandCompiled, ctx: TContext): Promise<IHandleResult> {
        const cb = this.dispatcher.getInvokable(command)

        try {
            const exec = cb.invokable as ICmdFunction<TContext>
            if (this.dispatcher.isBuiltInCommand(command)) {
                exec.bind(this.dispatcher)
            }
            const res = await exec(proxy, ctx)
            if (res?.error) {
                log.error(`Command "${command}" invokation error: ${res.error}`)
                return {
                    success: false,
                    markup: {
                        text: `${UiUnicodeSymbols.error} Invokation failed: "${res.error ?? "unknown error"}"`
                    }
                }
            } else {
                log.info(`Command "${command}" invokation success`)
                return {
                    success: true,
                    markup: {
                        text: SEND_SUCCESS ? `${UiUnicodeSymbols.success} Invokation success` : ""
                    }
                }
            }
        } catch (e: any) {
            log.error(`Command ${command} invokation error: ${anyToString(e)}\n`, e)
            return {
                success: false,
                markup: {
                    text: `Command invokation error:\n ${anyToString(e)}`
                }
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

    async invokeService(userId: string, { command: serviceName, raw: readArgs }: ICommandCompiled, ctx: TContext): Promise<IHandleResult> {
        if (this.dispatcher.isServiceActive(userId, serviceName)) {
            return {
                success: false,
                markup: {
                    text: `${UiUnicodeSymbols.warning} Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" already active.`
                }
            }
        }

        const cb = this.dispatcher.getInvokable(serviceName)
        if (!cb || (isFunc(cb.invokable))) {
            return {
                success: false,
                markup: {
                    text: `${UiUnicodeSymbols.error} Command service ${UiUnicodeSymbols.arrowRight} "${serviceName}" not found.`
                }
            }
        }
        const exe = cb.invokable as ICmdService

        const { config, params, messages } = this.compiledArgToInvokeArg(readArgs)

        const inputData = {
            config,
            params,
            messages
        }
        log.trace(`----Invoke-args\n
config:   ${JSON.stringify(config, null, 2)}
params:   ${JSON.stringify(params, null, 2)}
messages: ${JSON.stringify(messages, null, 2)}`)

        const serviceInstance = exe.clone(userId, inputData)

        const userServices = this.dispatcher.UserActiveServices(userId)

        serviceInstance.on("message", async (message: string) => {
            await ctx.reply(message)
        })
        serviceInstance.on('done', async (msg: string = "") => {
            this.dispatcher.RemoveUserAcitveService(userId, serviceName)
            log.info("-- Service done: " + serviceName)
            msg = msg.length > 0 ? msg : `${UiUnicodeSymbols.info} - ${msg}`
            await ctx.reply(`${UiUnicodeSymbols.success} Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" done.\n${msg}`)
        })
        log.info("-- Starting service: " + serviceInstance.name)

        try {
            await serviceInstance.Initialize()
            userServices.push(serviceInstance)
            serviceInstance.run()
            return {
                success: true,
                markup: {
                    text: `Service ${UiUnicodeSymbols.arrowRight} "${serviceName}" ${UiUnicodeSymbols.star} started.`
                }
            }
        } catch(e: any) {
            log.error(`Error starting service ${serviceName}: ${anyToString(e)}`, e)
            return {
                success: false,
                markup: {
                    text: `${UiUnicodeSymbols.error} Error starting service ${UiUnicodeSymbols.arrowRight} "${serviceName}":\n -- ${UiUnicodeSymbols.warning} ${anyToString(e)}` 
                }
            }
        }
    }
}

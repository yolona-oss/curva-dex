import log from "@core/utils/logger"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"

// TODO reaimplement with fn execution loginc inside cmd handler

export class HandleCallbackExecution<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {

    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE CALLBACK EXECUTION CMD")

        const { command, uiCtx, userId, args, currentCmdHandler } = request

        try {
            const cb = currentCmdHandler.getCallbackFromCommandName(command)
            const userServices = currentCmdHandler.ActiveServices.get(userId)

            if (!userServices) {
                currentCmdHandler.ActiveServices.set(userId, [])
            }

            if (typeof cb.fn === 'function') { // simple command
                const res = await cb.fn(args, uiCtx)
                return {
                    success: res?.error ? false : true,
                    text: res?.error ?? undefined
                }
            } else if (cb.fn) { // service exe command
                //const serviceName = cb.fn.name
                const serviceName = command

                if (userServices!.map(serv => serv.name).includes(serviceName)) {
                    return {
                        success: false,
                        text: `Service ${serviceName} already active.`
                    }
                }

                const serviceInstance = cb.fn.clone(userId)

                serviceInstance.on("message", async (message: string) => {
                    await uiCtx.reply(message)
                })
                serviceInstance.on('done', async (msg: string = "") => {
                    const services = userServices
                    if (!services) {
                        log.error(`No active services for user ${userId}`)
                        return
                    }
                    services.splice(services!.map(serv => serv.name).indexOf(serviceName), 1)
                    log.echo("-- Service done: " + serviceName)
                    await uiCtx.reply(`Service ${serviceName} done. ${msg}`)
                })
                log.echo("-- Starting service: " + serviceInstance.name)

                await serviceInstance.Initialize()
                userServices!.push(serviceInstance)
                serviceInstance.run()
            }
        } catch (e: any) {
            if ('success' in e) {
                return e as ICmdHandlerResponce
            }

            log.error("Command exe&setup error: " + e) // TODO naming
            const msg = e instanceof Error ? e.message : e
            return {
                success: false,
                text: String(msg)
            }
        }

        return await super.handle(request)
    }
}

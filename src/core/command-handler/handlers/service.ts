import { BuiltInServiceCommandsEnum } from "../constants"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"

export class HandleServiceCommand<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE SERVICE CMD")
        const { command, userId, args, currentCmdHandler } = request

        // go next
        if (command !== BuiltInServiceCommandsEnum.STOP_COMMAND && command !== BuiltInServiceCommandsEnum.SEND_MSG_COMMAND) {
            return await super.handle(request)
        }

        let userServices = currentCmdHandler.ActiveServices.get(userId)

        if (!userServices) {
            currentCmdHandler.ActiveServices.set(userId, [])
        }

        userServices = userServices!

        const userServicesNames = userServices.map(s => s.name)

        const serviceName = args[0]

        if (!serviceName) {
            return {
                success: false,
                text: "No service name passed"
            }
        }

        if (!userServicesNames.includes(serviceName)) {
            return {
                success: false,
                text: `Service ${serviceName} not active.`
            }
        }

        const message = args[1]
        const messageArgs = args.slice(2) ?? []

        if (command === BuiltInServiceCommandsEnum.STOP_COMMAND) {
            await userServices.find(serv => serv.name === serviceName)!.terminate()
            userServices.splice(userServicesNames.indexOf(serviceName), 1)
            return {
                success: true,
                text: `Service "${serviceName}" stopped.`
            }
        } else if (command === BuiltInServiceCommandsEnum.SEND_MSG_COMMAND) {
            if (!message) {
                return {
                    success: false,
                    text: "No message passed"
                }
            }

            await userServices.find(serv => serv.name === serviceName)!.receiveMsg(message, messageArgs)
            return {
                success: true,
                text: `Service "${serviceName}" message sent.`
            }
        }

        return await super.handle(request)
    }
}

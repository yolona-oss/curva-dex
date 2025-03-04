import { BuiltInHelpCommandsEnum } from "../constants"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"
import { commonToString, serviceToString, uiCommandsToString } from "../cmd-to-string"
import { BaseCommandService } from "../command-service"

export class HandleHelpCmd<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE HELP CMD")

        const { currentCmdHandler, command, args } = request
        const uiCmds = currentCmdHandler.mapHandlersToUICommands()

        switch (command) {
            case BuiltInHelpCommandsEnum.HELP_COMMAND:
                const allCommandsUsageStr = uiCommandsToString(uiCmds)
                return {
                    success: true,
                    text: allCommandsUsageStr
                }
            case BuiltInHelpCommandsEnum.CHELP_COMMAND:
                if (!args[0] || args[0].length == 0) {
                    return {
                        success: false,
                        text: "Missing command name"
                    }
                }
                const cmd = currentCmdHandler.getCallbackFromCommandName(args[0])
                if (!cmd) {
                    return {
                        success: false,
                        text: `Unknown command "${args[0]}"`
                    }
                }
                const isService = cmd.fn instanceof BaseCommandService
                const commandHelpStr = isService ? serviceToString<Ctx>(command, cmd) : commonToString<Ctx>(command, cmd)
                return {
                    success: true,
                    text: commandHelpStr
                }
        }

        return await super.handle(request)
    }
}

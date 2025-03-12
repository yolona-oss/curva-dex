import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"
import log from "@core/utils/logger"
import { CmdAlias } from "@core/db"

export class HandleCommandAlias<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {

    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE", this.constructor.name)
        const { command, currentCmdHandler, uiCtx, ownerId } = request

        const aliasDoc = await CmdAlias.findOne({owner_id: ownerId, alias: command})
        if (!aliasDoc) {
            return super.handle(request)
        }

        const commandStr = aliasDoc.command
        const commandSplit = commandStr.split(" ")
        const commandName = commandSplit[0]
        const commandArg = commandSplit.slice(1).join(" ")
        if (!currentCmdHandler.isCommandRegistered(commandName)) {
            return {
                success: false,
                text: `Aliased(${aliasDoc.alias}) command "${commandName}" is not registered.`
            }
        }
        try {
            const built = await currentCmdHandler.CommandBuilder.parseCompeteInput(request.userId, commandName, commandArg, uiCtx, currentCmdHandler)
            return await currentCmdHandler.CommandExecutor.execute(request.userId, commandStr, built.args, uiCtx)
        } catch (e: any) {
            log.error("Command execution error: " + anyToString(e))
            return {
                success: false,
                text: `${UiUnicodeSymbols.error} Command ${UiUnicodeSymbols.arrowRight} "${command}" execution error:\n -- ${anyToString(e) || UiUnicodeSymbols.warning  + " unknown error"}`
            }
        }
    }
}

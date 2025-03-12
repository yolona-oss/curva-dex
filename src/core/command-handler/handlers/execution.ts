import log from "@core/utils/logger"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"

export class HandleCallbackExecution<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {

    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        const { command, uiCtx, userId, args, composer } = request

        let res
        try {
            const built = await composer.CommandBuilder.parseCompeteInput(userId, command, args.join(' '), uiCtx, composer)
            res = await composer.CommandExecutor.execute(userId, command, built.args, uiCtx)
        } catch (e: any) {
            log.error("Command execution error: " + anyToString(e))
            return {
                success: false,
                text: `${UiUnicodeSymbols.error} Command ${UiUnicodeSymbols.arrowRight} "${command}" execution error:\n -- ${anyToString(e) || UiUnicodeSymbols.warning  + " unknown error"}`
            }
        }

        if (res.success) {
            return res
        } else {
            uiCtx.reply(`${UiUnicodeSymbols.error} Command ${UiUnicodeSymbols.arrowRight} "${command}" failed:\n -- ${UiUnicodeSymbols.warning} ${res.text ?? UiUnicodeSymbols.warning  + " unknown error"}`)
        }

        return await super.handle(request)
    }
}

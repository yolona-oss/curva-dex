import logger from '@logger';
import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"
import { BaseUIContext } from "@core/ui"
import { anyToString } from "@core/utils/misc"
import { UiUnicodeSymbols } from "@core/ui"

export class HandleCallbackExecution<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {

    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        const { command, uiCtx, userId, args, composer } = request

        let res: ICmdHandlerResponce|undefined
        try {
            const compiled = await composer.CommandBuilder.chipsCompile(userId, command, args.join(' '), uiCtx, composer)
            res = await composer.CommandInvoker.invoke(userId, compiled.Result, uiCtx)
        } catch (e: any) {
            log.error("Command execution error: " + anyToString(e))
            return {
                success: false,
                markup: {
                    text: `${UiUnicodeSymbols.error} Command ${UiUnicodeSymbols.arrowRight} "${command}" execution error:\n -- ${anyToString(e) || UiUnicodeSymbols.warning  + " unknown error"}`
                }
            }
        }

        if (res.success) {
            return res
        } else {
            uiCtx.reply(`${UiUnicodeSymbols.error} Command ${UiUnicodeSymbols.arrowRight} "${command}" failed:\n -- ${UiUnicodeSymbols.warning} ${res.markup?.text ?? UiUnicodeSymbols.warning  + " unknown error"}`)
        }

        return await super.handle(request)
    }
}

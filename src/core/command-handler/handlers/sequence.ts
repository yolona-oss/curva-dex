import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"

import log from '@utils/logger'

export class HandleSequenceCommand<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE SEQUENCE CMD")

        const { command, userId, currentCmdHandler } = request
        let res
        let err
        const sequenceHandler = currentCmdHandler.SequenceHandler
        try {
            res = sequenceHandler.handle(userId, command)
        } catch (e: any) {
            log.error(`Sequence handling error: ` + e)
            err = String(e instanceof Error ? e.message : e)
        }
        if (err) {
            return {
                success: false,
                text: err
            }
        }

        if (res) {
            return res
        }

        return await super.handle(request)
    }
}

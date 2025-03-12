import { anyToString } from "@core/utils/misc"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"

import log from '@utils/logger'

export class HandleSequenceCommand<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE SEQUENCE CMD")

        const { command, userId, currentCmdHandler } = request

        const cb = currentCmdHandler.getCallbackFromCommandName(command)
        if (!cb.seqBounded) {
            return await super.handle(request)
        }

        let res
        let err
        const sequenceHandler = currentCmdHandler.SequenceHandler
        try {
            res = sequenceHandler.handle(userId, command)
        } catch (e: any) {
            err = anyToString(e)
            log.error(`Sequence handling error: ` + err)
        }
        if (err && err.length > 0) {
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

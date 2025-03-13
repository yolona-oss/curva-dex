import { AbstractCmdHandler, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler";
import { BaseUIContext } from "@core/ui";

export class HandleCmdBuilder<UICtx extends BaseUIContext> extends AbstractCmdHandler<UICtx> {
    handle(request: ICmdHandlerRequest<UICtx>): Promise<ICmdHandlerResponce> {
        //const { args, command, userId } = request

        return super.handle(request)
    }
}

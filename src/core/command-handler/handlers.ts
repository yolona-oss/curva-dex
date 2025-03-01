import { BaseUIContext } from "@core/ui"
import { ICmdHandler, ICmdHandlerRequest, ICmdHandlerResponce } from "./types"

abstract class AbstractCmdHandler<Ctx extends BaseUIContext> implements ICmdHandler<Ctx> {
    private next: ICmdHandler<Ctx> | null = null

    constructor() { }

    setNext(next: ICmdHandler<Ctx>) {
        this.next = next
        return next
    }

    async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        if (this.next) {
            return await this.next.handle(request)
        }

        return { isError: true, text: "" }
    }
}

export class DefaultCommandHandler<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {

        return await super.handle(request)
    }
}

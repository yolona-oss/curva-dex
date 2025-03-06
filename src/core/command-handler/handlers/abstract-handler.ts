import { BaseUIContext } from "@core/ui"
import { ICmdHandler, ICmdHandlerRequest, ICmdHandlerResponce } from "./../types"

export type { ICmdHandler, ICmdHandlerRequest, ICmdHandlerResponce, BaseUIContext }

export abstract class AbstractCmdHandler<Ctx extends BaseUIContext> implements ICmdHandler<Ctx> {
    private next: ICmdHandler<Ctx> | null = null

    constructor() { }

    setNext(next: ICmdHandler<Ctx>) {
        this.next = next
        return next
    }

    async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {
        console.log("HANDLE", this.constructor.name)
        if (this.next) {
            return await this.next.handle(request)
        }

        console.log("LAST HANDLER")
        return { success: false, text: "No handler" }
    }
}

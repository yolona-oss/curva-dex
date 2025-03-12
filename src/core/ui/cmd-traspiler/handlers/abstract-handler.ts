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
        if (this.next) {
            console.log(this.next.constructor.name, "handle")
            return await this.next.handle(request)
        }

        console.log("-- CmdHandler chain end --")
        return { success: false, markup: {text: "No handler"} }
    }
}

import { CHComposer } from "../ch-composer"
import { Chain, IChainHandler } from "@core/utils/chain"
import { IHandleCommandResult } from "../types"
import { BaseUIContext } from "@core/ui"

export type ICmdHandlerResponce = IHandleCommandResult
export interface ICmdHandlerRequest<Ctx extends BaseUIContext> {
    composer: CHComposer<Ctx>,
    text: string,
    command: string,
    uiCtx: Ctx,
    userId: string,
    ownerId: string,
    args: string[]
}
export type ICmdHandler<Ctx extends BaseUIContext> = IChainHandler<ICmdHandlerRequest<Ctx>, Promise<ICmdHandlerResponce>>
export type ICommandHandlerChain<Ctx extends BaseUIContext> = Chain<ICmdHandlerRequest<Ctx>, Promise<ICmdHandlerResponce>>

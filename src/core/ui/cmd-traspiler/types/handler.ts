// NOTE: add ctx extension from base ui ctx

import { WithNeighbors } from "@core/types/with-neighbors"
import { BaseCommandService } from "../command-service"
import { BaseUIContext, IUICommandSimple } from "@core/ui"
import { ICompiledReadArg } from "./../builder"
import { CHComposer } from "../ch-composer"
import { Chain, IChainHandler } from "@core/utils/chain"
import { BaseCommandArgumentMetaDesc } from "@core/ui/types/command"
import { IBaseMarkup } from "./markup"

export type ICmdFunction<Ctx> = (args: string[], ctx: Ctx) => Promise<{error?: string}|void>
export type ICmdService = BaseCommandService<any, any, any>

export type ICmdMixin<Ctx> = ICmdFunction<Ctx> | ICmdService

export interface ICmdCallback<Ctx> extends Partial<WithNeighbors> {
    execMixin: ICmdMixin<Ctx>
    description: string
    args?: (BaseCommandArgumentMetaDesc&{name: string})[]
    seqBounded: boolean
}

export type ICmdHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

export interface ICmdRegisterEntry<Ctx> {
    command: ICmdHandlerCommand,
    mixin: ICmdMixin<Ctx>
}

export type ICmdRegisterManyEntry<Ctx> = Array<ICmdRegisterEntry<Ctx>>

export interface ICommandHandleResult {
    success: boolean
    markup?: IBaseMarkup
}

export type ICmdHandlerResponce = ICommandHandleResult
export interface ICmdHandlerRequest<Ctx extends BaseUIContext> {
    composer: CHComposer<Ctx>,
    text: string,
    command: string,
    uiCtx: Ctx,
    userId: string,
    ownerId: string,
    args: string[]
}
export type ICmdHandler<Ctx extends BaseUIContext> = IChainHandler<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>
export type ICommandHandlerChain<Ctx extends BaseUIContext> = Chain<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>

export interface PrimaryInvokeParams {
    command: string
    args: ICompiledReadArg[]
}

// NOTE: add ctx extension from base ui ctx

import { WithNeighbors } from "@core/types/with-neighbors"
import { BaseCommandService } from "../command-service"
import { BaseUIContext, IUICommandSimple } from "@core/ui"
import { ICmdBuilderMarkupOption } from "./builder"
import { MotherCmdHandler } from "../mother-cmd-handler"
import { Chain, IChainHandler } from "@core/utils/chain"
import { BaseCommandArgumentDesc } from "@core/ui/types/command"

export type ICmdFunction<Ctx> = (args: string[], ctx: Ctx) => Promise<{error?: string}|void>
export type ICmdService = BaseCommandService<any, any, any>

export type ICmdMixin<Ctx> = ICmdFunction<Ctx> | ICmdService

export interface ICmdCallback<Ctx> extends Partial<WithNeighbors> {
    execMixin: ICmdMixin<Ctx>
    description: string
    args?: (BaseCommandArgumentDesc&{name: string})[]
}

export type ICmdHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

export interface ICmdRegisterEntry<Ctx> {
    command: ICmdHandlerCommand,
    mixin: ICmdMixin<Ctx>
}

export type ICmdRegisterManyEntry<Ctx> = Array<ICmdRegisterEntry<Ctx>>

export interface ICmdHandlerExecResult {
    success: boolean
    text?: string
    markup?: ICmdBuilderMarkupOption[]
}

export type ICmdHandlerResponce = ICmdHandlerExecResult
export interface ICmdHandlerRequest<Ctx extends BaseUIContext> {
    currentCmdHandler: MotherCmdHandler<Ctx>,
    command: string,
    uiCtx: Ctx,
    userId: string,
    args: string[]
}
export type ICmdHandler<Ctx extends BaseUIContext> = IChainHandler<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>
export type ICommandHandlerChain<Ctx extends BaseUIContext> = Chain<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>

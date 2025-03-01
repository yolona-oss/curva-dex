// NOTE: add ctx extension from base ui ctx

import { WithNeighbors } from "@core/types/with-neighbors"
import { BaseCommandService } from "../command-service"
import { BaseUIContext, IUICommandSimple } from "@core/ui"
import { IBuilderMarkupOption } from "./builder"
import { CommandHandler } from "../command-handler"
import { Chain, IChainHandler } from "@core/utils/chain"

export type ICmdFunction<Ctx> = (ctx: Ctx) => Promise<string|void>
export type ICmdService = BaseCommandService<any, any, any>

export type ICmdMixin<Ctx> = ICmdFunction<Ctx> | ICmdService

export interface ICmdCallback<Ctx> extends Partial<WithNeighbors> {
    fn: ICmdMixin<Ctx>
    description: string
    args?: string[]
}

export type ICmdHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

export interface ICmdRegister<Ctx> {
    command: ICmdHandlerCommand,
    handler: ICmdMixin<Ctx>
}

export type ICmdRegisterMany<Ctx> = Array<ICmdRegister<Ctx>>

export interface ICmdHandlerExecResult {
    isError: boolean
    text?: string
    markup?: IBuilderMarkupOption[]
}

export type ICmdHandlerResponce = ICmdHandlerExecResult
export interface ICmdHandlerRequest<Ctx extends BaseUIContext> {
    commandHandler: CommandHandler<Ctx>,
    command: string,
    ctx: Ctx
}
export type ICmdHandler<Ctx extends BaseUIContext> = IChainHandler<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>
export type ICommandHandlerChain<Ctx extends BaseUIContext> = Chain<ICmdHandlerRequest<Ctx>, ICmdHandlerResponce>

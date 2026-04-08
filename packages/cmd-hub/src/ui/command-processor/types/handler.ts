import { BaseUIContext, IUICommand } from "@core/ui"
import { IvokeableType, IUI_InvokableCommand } from "@core/ui/types/command"
import { IBaseMarkup } from "./markup"

export interface IUICommandEntry<Ctx extends BaseUIContext> extends Omit<IUI_InvokableCommand<Ctx>, 'command'> {
    seqBounded: boolean
}

export interface IHandleResult {
    success: boolean
    markup: IBaseMarkup
}

export interface ICmdRegisterEntry<Ctx extends BaseUIContext> {
    command: IUICommand,
    invokable: IvokeableType<Ctx>
}
export type ICmdRegisterManyEntry<Ctx extends BaseUIContext> = Array<ICmdRegisterEntry<Ctx>>

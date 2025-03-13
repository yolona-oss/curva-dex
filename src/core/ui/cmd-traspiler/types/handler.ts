import { BaseUIContext, IUICommand } from "@core/ui"
import { ICallbackType, IUICommandCallback } from "@core/ui/types/command"
import { IBaseMarkup } from "./markup"

export interface IComposerUICmdCallback<Ctx extends BaseUIContext> extends Omit<IUICommandCallback<Ctx>, 'command'> {
    seqBounded: boolean
}

export interface IHandleCommandResult {
    success: boolean
    markup?: IBaseMarkup
}

export interface ICmdRegisterEntry<Ctx extends BaseUIContext> {
    command: IUICommand,
    callback: ICallbackType<Ctx>
}
export type ICmdRegisterManyEntry<Ctx extends BaseUIContext> = Array<ICmdRegisterEntry<Ctx>>

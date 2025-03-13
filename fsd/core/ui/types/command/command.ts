import { WithNeighbors } from "@core/types/with-neighbors"
import { ICmdArgumentDefenition, IArgumentDescriptor, IArgumentCompiled, CmdArgumentMeta } from "./argument"
import { BaseCommandService } from './service'
import { BaseUIContext } from "@core/ui"

/**
 * @description Describes the UI command base defenition mapping
 * command - collable command name
 * description - command description
 * args - command arguments names. Optional argumets must be starts with ? e.g ["arg1", "arg2", "?arg3"] - arg3 will be optional
 */
interface CommandSklet extends Partial<WithNeighbors> {
    command: string
    description: string
    args?: ICmdArgumentDefenition
}

/** @description Describes the UI bound command base defenition */
export type IUICommand = CommandSklet

/** @description IUICommand with arguments read metadata */
export interface IUICommandProcessed extends IUICommand {
    args: (CmdArgumentMeta & {name: string})[]
}

/** RENAME IT! its used only as dto representation of current composer callbacks */
export type IUICommandWithOutArgs = Omit<CommandSklet, "args">

export interface ICommandCompiled {
    command: string
    args: IArgumentCompiled[]
}

export function isFunc(mixin: ICallbackType<any>): mixin is ICmdFunction<any> {
    return typeof mixin === "function"
}

export function isService(mixin: ICallbackType<any>): mixin is ICmdService {
    return !isFunc(mixin)
}

// Callback types
type FuncResultType = ({error?: string})|void
export type ICmdFunction<Ctx extends BaseUIContext> = (args: IArgumentCompiled[], ctx: Ctx) => Promise<FuncResultType>
//export type ICmdObscuredFunction<Ctx> = (ctx: Ctx, ...args: any[]) => Promise<FuncResultType>
export type ICmdService = BaseCommandService<any, any, any, any>
export type ICallbackType<UI extends BaseUIContext> = ICmdFunction<UI> | ICmdService

/**
 * IUICommand with callback object to ui command.
 * Mapped to use in composer
 */
export interface IUICommandCallback<Ctx extends BaseUIContext> extends IUICommandProcessed {
    callback: ICallbackType<Ctx>
}

/** @description Describes the UI commands mapping to parse from */
export interface IUICommandDescriptor {
    args: IArgumentDescriptor[]
}

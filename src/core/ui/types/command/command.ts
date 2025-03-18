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
    readonly command: string
    readonly description: string
    args?: ICmdArgumentDefenition
}

/** @description Describes the UI bound command base defenition */
export type IUICommand = CommandSklet

/** @description IUICommand with arguments read metadata */
export interface IUICommandProcessed extends IUICommand {
    readonly args: (CmdArgumentMeta & {name: string})[]
}

/** RENAME IT! */
export type IUICommandWithOutArgs = Omit<CommandSklet, "args">

import { CmdArgumentProxy } from "@core/ui/command-processor/arg-proxy"

export interface ICommandCompiled {
    readonly command: string
    readonly proxy: CmdArgumentProxy
    readonly raw: IArgumentCompiled[]
}

export function isFunc(mixin: IvokeableType<any>): mixin is ICmdFunction<any> {
    return typeof mixin === "function"
}

export function isService(mixin: IvokeableType<any>): mixin is ICmdService {
    return !isFunc(mixin)
}

// invokable types
type FuncResultType = ({error?: string})|void
export type ICmdFunction<Ctx extends BaseUIContext> = (args: CmdArgumentProxy, ctx: Ctx) => Promise<FuncResultType>
//export type ICmdObscuredFunction<Ctx> = (ctx: Ctx, ...args: any[]) => Promise<FuncResultType>
export type ICmdService = BaseCommandService<any, any, any, any>
export type IvokeableType<UI extends BaseUIContext> = ICmdFunction<UI> | ICmdService

/**
 * IUICommand with invokable object to ui command.
 * Mapped to use in dispatcher
 */
export interface IUI_InvokableCommand<Ctx extends BaseUIContext> extends IUICommandProcessed {
    readonly invokable: IvokeableType<Ctx>
}

/** @description Describes the UI commands mapping to parse from */
export interface IUICommandDescriptor {
    args: IArgumentDescriptor[]
}

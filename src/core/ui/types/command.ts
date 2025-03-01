import { BaseCommandService } from "@core/command-handler"

/**
 * @description Describes the UI commands mapping
 * command - collable command name
 * description - command description
 * args - command arguments names. Optional argumets must be starts with ? e.g ["arg1", "arg2", "?arg3"] - arg3 will be optional
 */
interface BaseCommand {
    command: string
    description: string
    args?: string[]
}

export const isArgOptional = (arg: string) => arg.startsWith("?")

/**
 * @description Describes the UI commands mapping with execution handler and sequence connections with other commands
 */
export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    fn: (this: ThisUI, ctx: CtxType) => Promise<void> |
        BaseCommandService<any>

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand

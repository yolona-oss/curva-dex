import { BaseCommandService, MotherCmdHandler } from "@core/command-handler"
import { IManager } from "@core/db"
import { BaseUIContext } from ".."

type SetterPattern = (...args: any[]) => Promise<string[]>
export type CmdArgumentOptionSetter = (o: MotherCmdHandler<any>, manager: IManager) => Promise<string[]>
export type CmdArgumentOptionsType<OptionsSetter extends SetterPattern = CmdArgumentOptionSetter> = string[]|OptionsSetter

// TODO some how create argument selection context for saveing prev selected arg to set next arg in one command.
//      e.g. for command set variable: set service_123 var1 path_to_some __jopa__. if pipe service name to next option selection we can asses to service config scope.

export interface CmdArgumentDef {
    name: string
    optional: boolean
    optType: "string"|"object"|"number"|"none"
    description?: string
    validator?: (arg: string) => boolean
    options?: CmdArgumentOptionsType
}

export function exposeCmdArgumentDefOptions<CtxType extends BaseUIContext = any>(options: CmdArgumentOptionsType<any>, handler: MotherCmdHandler<CtxType>, manager: IManager) {
    if (options instanceof Function) {
        return options(handler, manager)
    } else if (Array.isArray(options)) {
        return options
    } else {
        throw new Error("Invalid options type")
    }
}

/**
 * @description Describes the UI commands mapping
 * command - collable command name
 * description - command description
 * args - command arguments names. Optional argumets must be starts with ? e.g ["arg1", "arg2", "?arg3"] - arg3 will be optional
 */
interface BaseCommand {
    command: string
    description: string
    args?: CmdArgumentDef[]
}

//export const isArgOptional = (arg: string) => arg.startsWith("?")

/**
 * @description Describes the UI commands mapping with execution handler and sequence connections with other commands
 */
export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    fn: (this: ThisUI, args: string[], ctx: CtxType) => Promise<void> | BaseCommandService<any>

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand

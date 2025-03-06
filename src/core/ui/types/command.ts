import { BaseCommandService, MotherCmdHandler } from "@core/command-handler"
import { IManager } from "@core/db"
import { BaseUIContext } from ".."

import 'reflect-metadata'

export const COMMAND_ARG_DESC_KEY = Symbol('commandArgDescKey')

// TODO some how create argument selection context for saveing prev selected arg to set next arg in one command.
//      e.g. for command set variable: set service_123 var1 path_to_some __jopa__. if pipe service name to next option selection we can asses to service config scope.

type SetterPattern = (...args: any[]) => Promise<string[]>
export type CmdArgumentOptionSetter = (cmdName: string, o: MotherCmdHandler<any>, manager: IManager) => Promise<string[]>
export type CmdArgumentPairOptionsType<OptionsSetter extends SetterPattern = CmdArgumentOptionSetter> = string[]|OptionsSetter

export interface BaseCommandArgumentDesc {
    required?: boolean
    description?: string
    validator?: (arg: string) => boolean

    standalone: boolean // mean dont need any option
    pairOptions?: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>
    defaultValue?: string
}

const CmdArgumentMetaDefaults: Partial<BaseCommandArgumentDesc> = {
    validator: () => true,
    required: false,
    pairOptions: [],
    description: "Common argument",
}

export function CmdArgument(metadata: BaseCommandArgumentDesc) {
    return function (target: any, propertyKey: string) {
        const defaultsMergeMetadata = {
            ...CmdArgumentMetaDefaults,
            ...metadata
        }
        Reflect.defineMetadata(COMMAND_ARG_DESC_KEY, defaultsMergeMetadata, target, propertyKey);
    };
}

export async function exposeCmdArgumentDefOptions<CtxType extends BaseUIContext = any>(
    cmdName: string,
    options: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>|undefined,
    handler: MotherCmdHandler<CtxType>,
    manager: IManager
) {
    if (options instanceof Function) {
        return await options(cmdName, handler, manager)
    } else if (Array.isArray(options)) {
        return options
    } else {
        return undefined
    }
}

export type CommandArgumentMetadata<T extends string|number|symbol = string> = Record<T, BaseCommandArgumentDesc>
export type CommandArgmuentKeyHolder = Record<string, any>

export function getCmdArgMetadata<T extends CommandArgmuentKeyHolder>(instance: T): CommandArgumentMetadata<keyof T> {
    const metadataMap: Partial<CommandArgumentMetadata<keyof T>> = {};

    // Iterate over all properties of the instance
    for (const key of Object.keys(instance) as Array<keyof T>) {
        const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, instance, key as string);
        if (metadata) {
            metadataMap[key] = metadata;
        }
    }

    return metadataMap as CommandArgumentMetadata<keyof T>
}

export function getCmdArgUndefMetadata<T extends CommandArgmuentKeyHolder>(target: T): CommandArgumentMetadata<keyof T> {
    const metadataMap: Partial<Record<keyof T, BaseCommandArgumentDesc>> = {}

    let currentTarget = target;
    while (currentTarget !== null && currentTarget !== Object.prototype) {
        const propertyKeys = Object.getOwnPropertyNames(currentTarget);

        propertyKeys.forEach((propertyKey) => {
            if (propertyKey === 'constructor' || typeof currentTarget[propertyKey] === 'function') {
                return;
            }

            const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, currentTarget, propertyKey);
            if (metadata && !metadataMap[propertyKey]) {
                metadataMap[propertyKey as keyof T] = metadata;
            }
        });

        // Move up the prototype chain
        currentTarget = Object.getPrototypeOf(currentTarget);
    }

    return metadataMap as CommandArgumentMetadata<keyof T>
}

export type CommandArgumentDefenition = Record<string, any> // with metadata attachment

/**
 * @description Describes the UI commands mapping
 * command - collable command name
 * description - command description
 * args - command arguments names. Optional argumets must be starts with ? e.g ["arg1", "arg2", "?arg3"] - arg3 will be optional
 */
interface BaseCommand {
    command: string
    description: string
    args?: CommandArgumentDefenition
}

//export const isArgOptional = (arg: string) => arg.startsWith("?")

/**
 * @description Describes the UI commands mapping with execution handler and sequence connections with other commands
 */
export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    exec: (this: ThisUI, args: string[], ctx: CtxType) => Promise<void> | BaseCommandService<any>

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand

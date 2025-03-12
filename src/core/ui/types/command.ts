import { BaseCommandService, CHComposer } from "@core/command-handler"
import { IManager } from "@core/db"
import { BaseUIContext } from ".."

import "reflect-metadata";

export const COMMAND_ARG_DESC_KEY = Symbol('descriptor:command-argument');

// TODO some how create argument selection context for saveing prev selected arg to set next arg in one command.
//      e.g. for command set variable: set service_123 var1 path_to_some __jopa__. if pipe service name to next option selection we can asses to service config scope.

type SetterPattern = (...args: any[]) => Promise<string[]>
export type CmdArgumentOptionSetter = (cmdName: string, composer: CHComposer<any>, manager: IManager) => Promise<string[]>
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
    standalone: true,
    defaultValue: undefined
}

export function CmdArgument(metadata: BaseCommandArgumentDesc) {
    return (target: any, propertyKey: string) => {
        const defaultsMergeMetadata = {
            ...CmdArgumentMetaDefaults,
            ...metadata
        }
        const existingMetadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, target) || {};
        existingMetadata[propertyKey] = defaultsMergeMetadata
        Reflect.defineMetadata(COMMAND_ARG_DESC_KEY, {...existingMetadata, ...defaultsMergeMetadata}, target)
    }
}

export type CommandArgumentMetadata<T extends string|number|symbol = string> = Record<T, BaseCommandArgumentDesc>
export type CommandArgmuentKeyHolder = Record<string, any>

export function getCmdArgMetadata<T>(
    target: any
): CommandArgumentMetadata<keyof T> {
    let metadataMap: Partial<Record<keyof T, BaseCommandArgumentDesc>> = {};
    let proto = target.prototype || Object.getPrototypeOf(target);

    while (proto && proto !== Object.prototype) {
        const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, proto);
        if (metadata) {
            for (const key in metadata) {
                if (key in CmdArgumentMetaDefaults) {
                    continue
                }
                metadataMap[key as keyof T] = {
                    ...metadata[key],
                    ...metadataMap[key as keyof T],
                };
            }
        }
        proto = Object.getPrototypeOf(proto);
    }

    return metadataMap as CommandArgumentMetadata<keyof T>;
}

export type CommandArgumentDefenition = Record<string, any> // with metadata attachment

export async function exposeCmdArgumentDefOptions<CtxType extends BaseUIContext = any>(
    cmdName: string,
    options: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>|undefined,
    handler: CHComposer<CtxType>,
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
export type IUICommandProcessed = BaseCommand & {args?: (BaseCommandArgumentDesc&{name: string})[]}

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

//export function getCmdArgMetadata<T>(
//  target: any
//): CommandArgumentMetadata<keyof T> {
//  let metadataMap: Partial<Record<keyof T, BaseCommandArgumentDesc>> = {};
//  let proto = target.prototype || Object.getPrototypeOf(target);
//
//  while (proto && proto !== Object.prototype) {
//    const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, proto);
//    if (metadata) {
//      for (const key in metadata) {
//        metadataMap[key as keyof T] = {
//          ...metadata[key],
//          ...metadataMap[key as keyof T],
//        };
//      }
//    }
//    proto = Object.getPrototypeOf(proto);
//  }
//
//  return metadataMap as CommandArgumentMetadata<keyof T>;
//}


export function __getCmdArgMetadata<T extends CommandArgmuentKeyHolder>(target: any): CommandArgumentMetadata<keyof T> {
    let metadataMap: Partial<Record<keyof T, BaseCommandArgumentDesc>> = {}
    
    let proto = target instanceof Object ? Object.getPrototypeOf(target) : target

    while (proto && proto !== Object.prototype) {
        const properties = new Set([
            ...Object.getOwnPropertyNames(proto),
            ...Object.keys(target)
        ])

        for (const propertyKey of properties) {
            const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, proto, propertyKey)
            if (metadata) {
                metadataMap[propertyKey as keyof T] = {
                    ...metadataMap[propertyKey],
                    ...metadata
                }
            }
        }

        proto = Object.getPrototypeOf(proto)
    }

    return metadataMap as CommandArgumentMetadata<keyof T>
}

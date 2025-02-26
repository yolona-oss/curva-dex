import { any, assign, union, Describe, optional, array, enums, Infer, assert, boolean, object, number, string } from 'superstruct'
import { CommandSign } from './Command.js'
import { CheckObjSign } from './Conditional.js'

export enum PlugTypeEnum {
    Executor = "Executor",
    Checker = "Checker",
    Database = "Database",
    Merged = "Merged"
}

export const PluginTypeSign = enums([ "Executor", "Checker", "Database", "Merged" ])

export const PluginSign = object({
    name: string(),
    type: PluginTypeSign,
})

export const ExecutorPluginSign = assign(
    object({
        state: any(),
        commands: array(CommandSign),
        actions: array(string())
    }),
    PluginSign
)

export const CheckerPluginSign = assign(
    object({
        checkers: array(CheckObjSign),
    }),
    PluginSign
)

export const DatabasePluginSign = assign(
    object({

    }),
    PluginSign
)

export type Plugin = Infer<typeof PluginSign>;
export type PluginType = Infer<typeof PluginTypeSign>;

export type ExecutorPlugin = Infer<typeof ExecutorPluginSign>;
export type CheckerPlugin = Infer<typeof CheckerPluginSign>;
export type DatabasePlugin = Infer<typeof DatabasePluginSign>;

import { BuiltInAccountCommandsEnum, BuiltInHelpCommandsEnum, BuiltInSeqCommandsEnum, BuiltInServiceCommandsEnum, BuiltInAliasCommandsEnum } from "./built-in-cmd-enum"

export const BLANK_USER_ID = "__pussy-killer__"
export const CLI_USER_ID = "--gandonio--"

export const BuiltInCmdNames = [
    ...Object.values(BuiltInSeqCommandsEnum),
    ...Object.values(BuiltInServiceCommandsEnum),
    ...Object.values(BuiltInAccountCommandsEnum),
    ...Object.values(BuiltInHelpCommandsEnum),
    ...Object.values(BuiltInAliasCommandsEnum),
]

export * from './builder'
export * from './built-in-cmd-enum'

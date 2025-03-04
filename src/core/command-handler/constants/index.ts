import { BuiltInAccountCommandsEnum, BuiltInHelpCommandsEnum, BuiltInSeqCommandsEnum, BuiltInServiceCommandsEnum } from "./built-in-cmd-enum"

export const BLANK_USER_ID = "__pussy-killer__"
//export const CLI_USER_ID = "--gandonio--"

export const BuiltInCmdNames = [
    ...Object.values(BuiltInSeqCommandsEnum),
    ...Object.values(BuiltInServiceCommandsEnum),
    ...Object.values(BuiltInAccountCommandsEnum),
    ...Object.values(BuiltInHelpCommandsEnum)
]

export * from './builder'
export * from './service'
export * from './built-in-cmd-enum'

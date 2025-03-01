import { DefaultAccountCommandsEnum, DefaultHelpCommandsEnum, DefaultSeqCommandsEnum, DefaultServiceCommandsEnum } from "@core/constants"

export const BLANK_USER_ID = "__pussy-killer__"

export const DefaultCommands = [
    ...Object.values(DefaultSeqCommandsEnum),
    ...Object.values(DefaultServiceCommandsEnum),
    ...Object.values(DefaultAccountCommandsEnum),
    ...Object.values(DefaultHelpCommandsEnum)
]

export * from './builder'
export * from './service'

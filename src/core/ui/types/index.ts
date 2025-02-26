export { type IUI } from "./ui";
export { type IUICommand, type IUICommandSimple } from './command'
export { type BaseUIContext } from './context'

import { IUICommand } from "./command";

export function mapCommands<ThisUI, CtxType>(commands: IUICommand<ThisUI, CtxType>[])/*: IUICommandSimple[] */{
    return commands.map(cmd => ({
        command: cmd.command,
        description: cmd.description
    }))
}

export type AvailableUIsType = "telegram" | "cli"

export const enum AvailableUIsEnum {
    Telegram = "telegram",
    CLI = "cli",
}

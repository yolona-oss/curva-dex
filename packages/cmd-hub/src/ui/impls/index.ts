export type AvailableUIsType = "telegram" | "cli" | (string & {})

export const enum AvailableUIsEnum {
    Telegram = "telegram",
    CLI = "cli",
}
export { TelegramUI, type TgContext } from './telegram'
export { CLIUI, type CLIContext } from './cli'

// Register built-in UIs
import { UIRegistry } from '../registry'
import { TelegramUI } from './telegram'
import { CLIUI } from './cli'

UIRegistry.register("telegram", (dispatcher: any, opts: any) => new TelegramUI(opts.token, dispatcher))
UIRegistry.register("cli", (dispatcher: any) => new CLIUI(dispatcher))

export type AvailableUIsType = "telegram" | "cli"

export const enum AvailableUIsEnum {
    Telegram = "telegram",
    CLI = "cli",
}
export { TelegramUI, type TgContext } from './telegram'
export { CLIUI, type CLIContext } from './cli'

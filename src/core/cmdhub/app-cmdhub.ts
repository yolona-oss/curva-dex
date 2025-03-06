import { Application } from "@core/application";
import { getInitialConfig } from "@core/config";
import { MotherCmdHandler } from "@core/command-handler";
import { AvailableUIsType, BaseUIContext, IUI } from "@core/ui/types";
import { CLIContext, CLIUI } from "@core/ui/cli";
import { TelegramUI, TgContext } from "@core/ui/telegram";

import log from '@utils/logger'

import { clearScreen } from '@utils/console'
import { FIGLET_LOGO, WELCOME_TEXT } from '@core/constants'

export class AppCmdhub extends Application<BaseUIContext> {
    constructor(
        ui_name: AvailableUIsType,
        cmdHandler: MotherCmdHandler<any>
    ) {
        const cfg = getInitialConfig()

        if (!cmdHandler.isInitialized()) {
            log.error("Command handler must be initialized before starting app")
            process.exit(-1)
        }
        
        log.echo("Initializing UI...")
        let selected_ui: IUI<any>
        switch (ui_name) {
            case "telegram":
                selected_ui = new TelegramUI(cfg.bot.token, cmdHandler)
                break
            case "cli":
                selected_ui = new CLIUI(cmdHandler)
                break
            default:
                log.error(`Unknown UI: ${ui_name}`)
                process.exit(-1)
        }

        super("cmdhub", selected_ui)
    }

    private printCommands() {
        if (!getInitialConfig().show_commands) {
            return
        }

        this.ui.printCommands()
    }

    private printBanner() {
        if (!getInitialConfig().show_logo) {
            return
        }

        function printLogo() {
            for (const line of FIGLET_LOGO) {
                for (const ch of line) {
                    process.stdout.write(ch)
                }
            }
        }
        clearScreen()
        printLogo()
        console.log(WELCOME_TEXT)
    }

    async Initialize(): Promise<void> {
        await super.Initialize()

        log.echo(`Initializing Application with UI: ${this.ui.ContextType()}...`)

        log.echo("Creating lock file for UI...")
        const locked = this.ui.lock(this.lockManager)
        if (!locked) {
            log.error("Application with same UI already running")
            process.exit(-1)
        }

        super.setInitialized()
    }

    async run(): Promise<void> {
        await super.run()

        if (getInitialConfig().dev_mode) {
            return
        }
        this.printBanner()
        this.printCommands()
    }
}

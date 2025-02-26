"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCmdhub = void 0;
const application_1 = require("@core/application");
const config_1 = require("@core/config");
const cli_1 = require("@core/ui/cli");
const telegram_1 = require("@core/ui/telegram");
const logger_1 = __importDefault(require("@utils/logger"));
const console_1 = require("@utils/console");
const constants_1 = require("@core/constants");
class AppCmdhub extends application_1.Application {
    constructor(ui_name, cmdHandler) {
        const cfg = (0, config_1.getInitialConfig)();
        if (!cmdHandler.isInitialized()) {
            logger_1.default.error("Command handler must be initialized before starting app");
            process.exit(-1);
        }
        logger_1.default.echo("Initializing UI...");
        let selected_ui;
        switch (ui_name) {
            case "telegram":
                selected_ui = new telegram_1.TelegramUI(cfg.bot.token, cmdHandler);
                break;
            case "cli":
                selected_ui = new cli_1.CLIUI(cmdHandler);
                break;
            default:
                logger_1.default.error(`Unknown UI: ${ui_name}`);
                process.exit(-1);
        }
        super("cmdhub", selected_ui);
        this.printBanner();
    }
    printBanner() {
        function printLogo() {
            for (const line of constants_1.FIGLET_LOGO) {
                for (const ch of line) {
                    process.stdout.write(ch);
                }
            }
        }
        (0, console_1.clearScreen)();
        printLogo();
        console.log(constants_1.WELCOME_TEXT);
    }
    async Initialize() {
        await super.Initialize();
        logger_1.default.echo(`Initializing Application with UI: ${this.ui.ContextType()}...`);
        super.setInitialized();
    }
}
exports.AppCmdhub = AppCmdhub;

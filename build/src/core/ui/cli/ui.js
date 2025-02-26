"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIUI = void 0;
const with_init_1 = require("@core/types/with-init");
const types_1 = require("@core/ui/types");
const db_1 = require("@core/db");
const logger_1 = __importDefault(require("@utils/logger"));
const readline_1 = __importDefault(require("readline"));
class CLIUI extends with_init_1.WithInit {
    commandHandler;
    context;
    rl;
    isActive = false;
    cmds;
    constructor(commandHandler) {
        super();
        this.commandHandler = commandHandler;
        this.context = {
            type: types_1.AvailableUIsEnum.CLI,
            userSession: { state: '', data: {} },
            text: "",
            reply: async (message) => {
                console.log('[' + new Date().toLocaleTimeString("ru") + ']' + "[CLI] < " + message);
            }
        };
        this.cmds = this.commandHandler.mapHandlersToCommands().map(cmd => cmd.command);
        console.log(this.cmds);
        this.setInitialized();
    }
    lock(_) {
        return true;
    }
    unlock(_) {
        return true;
    }
    ContextType() {
        return types_1.AvailableUIsEnum.CLI;
    }
    isRunning() {
        return this.isActive;
    }
    async run() {
        if (!this.isInitialized()) {
            throw new Error("CLIUI::run() not initialized");
        }
        if (this.isActive) {
            throw new Error("CLIUI::run() already running");
        }
        let manager = await db_1.Manager.findOne({ userId: -1 });
        if (!manager) {
            manager = await db_1.Manager.create({
                isAdmin: true,
                name: "CliAdmin",
                userId: -1,
                online: false,
                avatar: (await db_1.FilesWrapper.getDefaultAvatar()).id,
                useGreeting: true
            });
        }
        this.context.manager = manager;
        this.rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100,
            prompt: "[CLI] >",
            completer: (line) => {
                const completions = this.cmds.filter((c) => c.startsWith(line));
                return completions;
            }
        });
        logger_1.default.echo("Starting CLI...");
        this.rl.on('line', async (line) => {
            this.context.text = line;
            const [command, ...args] = line.split(' ');
            this.context.userSession.data.args = args;
            const response = await this.commandHandler.handleCommand(command, this.context);
            if (response) {
                this.context.reply(response);
            }
        });
        this.isActive = true;
    }
    async terminate() {
        if (!this.isActive) {
            throw new Error("CLIUI::terminate() not running");
        }
        if (this.rl) {
            this.rl.close();
        }
        await this.commandHandler.stop();
        this.isActive = false;
        logger_1.default.echo(" -- CLI ui stopped");
    }
}
exports.CLIUI = CLIUI;

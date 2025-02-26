"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramUI = void 0;
const config_1 = require("@core/config");
const types_1 = require("@core/ui/types");
const db_1 = require("@core/db");
const with_init_1 = require("@core/types/with-init");
const commands_1 = require("./constants/commands");
const constants_1 = require("./constants");
const lock_manager_1 = require("@utils/lock-manager");
const logger_1 = __importDefault(require("@utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
const telegraf = __importStar(require("telegraf"));
const chalk_1 = __importDefault(require("chalk"));
class TelegramUI extends with_init_1.WithInit {
    commandHandler;
    tgBotInstance;
    isActive = false;
    constructor(botApiKey, commandHandler) {
        super();
        this.commandHandler = commandHandler;
        this.tgBotInstance = new telegraf.Telegraf(botApiKey);
    }
    ContextType() {
        return types_1.AvailableUIsEnum.Telegram;
    }
    lock(lockManager) {
        return typeof lockManager.createLockFile(crypto_1.default.hash("sha256", (0, config_1.getInitialConfig)().bot.token)) === 'string';
    }
    unlock(lockManager) {
        return lockManager.deleteLockFile(lock_manager_1.LockManager.createLockFileName(crypto_1.default.hash("sha256", (0, config_1.getInitialConfig)().bot.token)));
    }
    isRunning() {
        return this.isActive;
    }
    async setupMiddleware() {
        this.tgBotInstance.use(async (ctx, next) => {
            const manager = await db_1.Manager.findOne({ userId: ctx.from.id });
            if (manager) {
                ctx.type = types_1.AvailableUIsEnum.Telegram;
                ctx.manager = manager;
                return next();
            }
            else if (ctx.updateType == 'callback_query') {
                if (ctx.update.callback_query.data.includes(constants_1.cb_data.approveRequest)) {
                    return next();
                }
            }
            logger_1.default.echo(constants_1.cb_data.approveRequest + " " + ctx.from.id);
            const botName = (await (0, config_1.getConfig)()).bot.name;
            await ctx.replyWithMarkdownV2(`Welcome to ${botName}. To start using bot you need to be aproved by bot administrator.\n" +
"Click on button for send approve request`, telegraf.Markup.inlineKeyboard([[{ text: "Send", callback_data: constants_1.cb_data.approveRequest + " " + ctx.from.id },]]));
        });
    }
    async setupActions() {
        this.tgBotInstance.action(RegExp(constants_1.cb_data.approveRequest + "*"), (ctx, next) => constants_1.actions.approverequest.call(this, ctx, next));
        this.tgBotInstance.action(RegExp(constants_1.cb_data.approveManager + "*"), (ctx, next) => constants_1.actions.approvemanager.call(this, ctx, next));
        this.tgBotInstance.action(RegExp(constants_1.cb_data.rejectManager + "*"), (ctx, next) => constants_1.actions.rejectmanager.call(this, ctx, next));
    }
    async setupCommands() {
        if (this.isInitialized()) {
            throw new Error("TelegemUI::init() already inited");
        }
        if (!this.commandHandler.isInitialized()) {
            throw new Error("TelegemUI::init() command handler not inited");
        }
        commands_1.DefaultTgUICommands.forEach(cmd => {
            logger_1.default.echo(`-- Assigning default command: "${cmd.command}"`);
            this.tgBotInstance.command(cmd.command, (ctx) => cmd.fn.call(this, ctx));
        });
        const commands = this.commandHandler.mapHandlersToCommands();
        commands.forEach(cmd => {
            logger_1.default.echo(`-- Assigning command: "${chalk_1.default.bold(cmd.command)}"`);
            this.tgBotInstance.command(cmd.command, async (ctx) => {
                try {
                    const response = await this.commandHandler.handleCommand(cmd.command, ctx);
                    if (response) {
                        await ctx.reply(response);
                    }
                }
                catch (e) {
                    await ctx.reply(`Internall error: ${e.message}`);
                    logger_1.default.error(`Command "${cmd.command}" "${ctx.manager.userId}" error: ${e.message}`, e);
                }
            });
        });
        const toAssignCmds = (0, types_1.mapCommands)(commands_1.DefaultTgUICommands).concat(commands).map(cmd => ({ command: cmd.command, description: cmd.description }));
        this.verifyCommands(toAssignCmds);
        logger_1.default.echo(`Commands verified ${chalk_1.default.green("successfully")}. Total commands: ${chalk_1.default.bold(toAssignCmds.length)}`);
        await this.tgBotInstance.telegram.setMyCommands(toAssignCmds);
        this.setInitialized();
    }
    verifyCommands(commands) {
        const maxCmdLength = 32;
        const maxDescLength = 256;
        const CmdAllowedSymbols = "A-Za-z0-9_";
        const commandList = commands.map(cmd => cmd.command);
        const descriptionList = commands.map(cmd => cmd.description);
        for (const cmd of commandList) {
            if (cmd.length > maxCmdLength) {
                throw new Error(`Command "${cmd}" is too long. Max length is ${maxCmdLength}, command length is ${cmd.length}`);
            }
            if (cmd.match(new RegExp(`[^${CmdAllowedSymbols}]`))) {
                throw new Error(`Command "${cmd}" contains invalid symbols`);
            }
        }
        let i = 0;
        for (const desc of descriptionList) {
            if (desc.length > maxDescLength) {
                throw new Error(`Description of command "${commandList[i]}" "${desc}" is too long. Max length is ${maxDescLength}, description length is ${desc.length}`);
            }
            i++;
        }
    }
    async setup() {
        await this.setupMiddleware();
        await this.setupCommands();
        await this.setupActions();
    }
    async run() {
        await this.setup();
        if (!super.isInitialized()) {
            throw new Error("TelegemUI::run() not inited");
        }
        const Config = await (0, config_1.getConfig)();
        if (this.isActive) {
            throw new Error("TelegemUI::run() already running");
        }
        try {
            let adminExisted = true;
            let admin = await db_1.Manager.findOne({ userId: Config.bot.admin_id });
            if (!admin) {
                logger_1.default.echo("Creating admin...");
                adminExisted = false;
                const defaultAvatar = await db_1.FilesWrapper.getDefaultAvatar();
                if (!defaultAvatar) {
                    throw new Error("TelegemUI::run() default avatar not found");
                }
                await db_1.Manager.create({
                    isAdmin: true,
                    name: "Admin",
                    userId: Config.bot.admin_id,
                    online: false,
                    avatar: defaultAvatar.id,
                    useGreeting: true
                });
            }
            logger_1.default.echo("Starting Telegram-bot service...");
            this.tgBotInstance.launch(() => {
                logger_1.default.echo("Telegram-bot service launched!");
            });
            if (adminExisted) {
                logger_1.default.echo("Sending welcome message to admins...");
                for (let manager of await db_1.Manager.find()) {
                    if (!manager.useGreeting) {
                        continue;
                    }
                    await this.tgBotInstance.telegram.sendMessage(manager.userId, "Service now online");
                    this.tgBotInstance.telegram.sendSticker(manager.userId, constants_1.stickers.happy);
                }
            }
            logger_1.default.echo("** Telegram-bot service started");
        }
        catch (e) {
            throw new Error("TelegemUI::run() " + e);
        }
        this.isActive = true;
    }
    async terminate() {
        if (!this.isRunning()) {
            throw new Error("TelegemUI::terminate() not running");
        }
        this.isActive = false;
        await db_1.Manager.updateMany({ online: true }, { online: false });
        let managers = await db_1.Manager.find();
        for (let manager of managers) {
            if (!manager.useGreeting) {
                continue;
            }
            await this.notifyManagers(manager.userId, "Service going offline", constants_1.stickers.verySad);
        }
        await this.commandHandler.stop();
        this.tgBotInstance.stop();
        logger_1.default.echo("** Telegram ui stopped");
    }
    async notifyManagers(id, msg, stiker) {
        await this.tgBotInstance.telegram.sendMessage(id, msg);
        if (stiker) {
            await this.tgBotInstance.telegram.sendSticker(id, stiker);
        }
    }
    acceptDeclineMarkup(accept, decline) {
        return telegraf.Markup.inlineKeyboard([
            telegraf.Markup.button.callback("Accept", accept),
            telegraf.Markup.button.callback("Decline", decline)
        ]);
    }
}
exports.TelegramUI = TelegramUI;

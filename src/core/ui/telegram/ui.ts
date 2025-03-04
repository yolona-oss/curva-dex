import { getConfig, getInitialConfig } from '@core/config'
import { AvailableUIsEnum, AvailableUIsType, IUI, mapCommands } from '@core/ui/types';
import { FilesWrapper, Manager } from '@core/db';
import { MotherCmdHandler } from '@core/command-handler';
import { WithInit } from '@core/types/with-init';

import { DefaultTgUICommands } from './constants/commands';
import { cb_data, actions, stickers } from './constants';
import { TgContext } from "./types";

import { LockManager } from '@utils/lock-manager';
import log from '@utils/logger';

import crypto from 'crypto'
import * as telegraf from 'telegraf'
import chalk from 'chalk';

export class TelegramUI extends WithInit implements IUI<TgContext> {
    public readonly bot: telegraf.Telegraf<TgContext>
    private isActive: boolean = false;

    constructor(
        botApiKey: string,
        public readonly cmdHandler: MotherCmdHandler<TgContext>
    ) {
        super();
        this.bot = new telegraf.Telegraf(botApiKey);
    }

    ContextType(): AvailableUIsType {
        return AvailableUIsEnum.Telegram
    }

    public lock(lockManager: LockManager): boolean {
        return typeof lockManager.createLockFile(
            crypto.hash("sha256", getInitialConfig().bot.token)
        ) === 'string'
    }

    public unlock(lockManager: LockManager): boolean {
        return lockManager.deleteLockFile(
            LockManager.createLockFileName(
                crypto.hash("sha256", getInitialConfig().bot.token)
            )
        )
    }

    isRunning(): boolean {
        return this.isActive;
    }

    private async setupMiddleware() {
        // Authorization
        this.bot.use(async (ctx, next) => {
            const manager = await Manager.findOne({ userId: ctx.from!.id })
            if (manager) {
                ctx.type = AvailableUIsEnum.Telegram
                ctx.manager = manager;
                return next();
            } else if (ctx.updateType == 'callback_query') {
                //@ts-ignore
                if (ctx.update.callback_query.data.includes(cb_data.approveRequest)) {
                    return next();
                }
            }
            log.echo(cb_data.approveRequest + " " + ctx.from!.id)
            const botName = (await getConfig()).bot.name
            await ctx.replyWithMarkdownV2(`Welcome to ${botName}. To start using bot you need to be aproved by bot administrator.\n" +
"Click on button for send approve request`,
                telegraf.Markup.inlineKeyboard([ [ { text: "Send", callback_data: cb_data.approveRequest + " " + ctx.from!.id  }, ] ]));
        })
    }

    private async setupActions() {
        this.bot.action(RegExp(cb_data.approveRequest + "*"), (ctx, next) => actions.approverequest.call(this, ctx, next));
        this.bot.action(RegExp(cb_data.approveManager + "*"), (ctx, next) => actions.approvemanager.call(this, ctx, next));
        this.bot.action(RegExp(cb_data.rejectManager + "*"),  (ctx, next) => actions.rejectmanager.call(this, ctx, next));
    }

    private async setupCommands() {
        if (this.isInitialized()) {
            throw new Error("TelegemUI::init() already inited")
        }

        if (!this.cmdHandler.isInitialized()) {
            throw new Error("TelegemUI::init() command handler not inited")
        }

        const commands = this.cmdHandler.mapHandlersToUICommands();

        commands.forEach(cmd => {
            log.echo(`-- Assigning command: "${chalk.bold(cmd.command)}"`)
            this.bot.command(cmd.command, async (ctx) => {
                try {
                    const response = await this.cmdHandler.handleCommand(cmd.command, ctx);
                    await ctx.reply(String(response.text), );
                } catch (e: any) {
                    await ctx.reply(`Internall error: ${e.message}`);
                    log.error(`Command "${cmd.command}" "${ctx.manager.userId}" error: ${e.message}`, e);
                }
            });
        })

        const toAssignCmds = mapCommands(DefaultTgUICommands).concat(commands).map(cmd =>
            ({ command: cmd.command, description: cmd.description })
        )

        this.verifyCommands(toAssignCmds)
        log.echo(`Commands verified ${chalk.green("successfully")}. Total commands: ${chalk.bold(toAssignCmds.length)}`)

        // assign to autocomplete
        await this.bot.telegram.setMyCommands(toAssignCmds)

        this.setInitialized()
    }

    private verifyCommands(commands: { command: string, description: string }[]) {
        const maxCmdLength = 32
        const maxDescLength = 256
        const CmdAllowedSymbols = "A-Za-z0-9_";
        const commandList = commands.map(cmd => cmd.command);
        const descriptionList = commands.map(cmd => cmd.description);

        for (const cmd of commandList) {
            if (cmd.length > maxCmdLength) {
                throw new Error(`Command "${cmd}" is too long. Max length is ${maxCmdLength}, command length is ${cmd.length}`)
            }
            if (cmd.match(new RegExp(`[^${CmdAllowedSymbols}]`))) {
                throw new Error(`Command "${cmd}" contains invalid symbols`)
            }
        }

        let i = 0
        for (const desc of descriptionList) {
            if (desc.length > maxDescLength) {
                throw new Error(`Description of command "${commandList[i]}" "${desc}" is too long. Max length is ${maxDescLength}, description length is ${desc.length}`)
            }
            i++
        }
    }

    private async setup() {
        await this.setupMiddleware()
        await this.setupCommands()
        await this.setupActions()
        //this.bot.action(RegExp("builder_*"), async (ctx) => {
        //    try {
        //        let data = ctx.match.input.slice('builder_'.length)
        //        const res = await this.commandHandler.handleCommand(data, ctx as any);
        //
        //        const mk = res.markup ?
        //            res.markup.map(m => ({
        //                text: m.text,
        //                callback_data: "builder_"+m.callback_data
        //            }))
        //            :
        //            [];
        //        let keyboard = telegraf.Markup.inlineKeyboard([ [ ...mk ] ])
        //        await ctx.reply(String(res.text), keyboard);
        //    } catch (e: any) {
        //        log.error(e)
        //        const msg = e instanceof Error ? e.message : e
        //        ctx.reply(msg)
        //    }
        //})
        this.bot.on("text", async (ctx) => {
            try {
                if (ctx.text && ctx.text.startsWith("/")) {
                    return
                }
                const res = await this.cmdHandler.handleCommand(ctx!.text, ctx)
                const mk = res.markup ?
                    res.markup.map(m => ({
                        text: m.text,
                        callback_data: /*"builder_"+*/m.callback_data
                    }))
                    :
                    [];
                let keyboard = telegraf.Markup.inlineKeyboard([ [ ...mk ] ])
                await ctx.reply(String(res.text), keyboard)
            } catch (e: any) {
                log.error(e)
                const msg = e instanceof Error ? e.message : e
                ctx.reply(msg)
            }
        })
    }

    async run() {
        await this.setup()

        if (!super.isInitialized()) {
            throw new Error("TelegemUI::run() not inited")
        }

        const Config = await getConfig();

        if (this.isActive) {
            throw new Error("TelegemUI::run() already running")
        }

        try {
            let adminExisted = true;
            let admin = await Manager.findOne({ userId: Config.bot.admin_id })
            if (!admin) {
                log.echo("Creating admin...")
                adminExisted = false;
                const defaultAvatar = await FilesWrapper.getDefaultAvatar()
                if (!defaultAvatar) {
                    throw new Error("TelegemUI::run() default avatar not found")
                }
                await Manager.create({
                    isAdmin: true,
                    name: "Admin",
                    userId: Config.bot.admin_id,
                    online: false,
                    avatar: defaultAvatar.id,
                    useGreeting: true
                })
            }
            log.echo("Starting Telegram-bot service...")
            this.bot.launch(() => {
                log.echo("Telegram-bot service launched!")
            });
            if (adminExisted) {
                log.echo("Sending welcome message to admins...")
                for (let manager of await Manager.find()) {
                    if (!manager.useGreeting) {
                        continue
                    }
                    await this.bot.telegram.sendMessage(manager.userId, "Service now online");
                    this.bot.telegram.sendSticker(manager.userId, stickers.happy);
                }
            }
            log.echo("** Telegram-bot service started");
        } catch(e) {
            throw new Error("TelegemUI::run() " + e);
        }
        this.isActive = true;
    }

    async terminate() {
        if (!this.isRunning()) {
            throw new Error("TelegemUI::terminate() not running")
        }

        this.isActive = false;
        await Manager.updateMany({ online: true }, { online: false });
        let managers = await Manager.find();
        for (let manager of managers) {
            if (!manager.useGreeting) { continue } // skip
            await this.notifyManagers(manager.userId, "Service going offline", stickers.verySad)
        }
        await this.cmdHandler.stop()
        this.bot.stop();
        log.echo("** Telegram ui stopped");
    }

    private async notifyManagers(id: string|number, msg: string, stiker?: string) {
        await this.bot.telegram.sendMessage(id, msg);
        if (stiker) {
            await this.bot.telegram.sendSticker(id, stiker);
        }
    }

    acceptDeclineMarkup(accept: string, decline: string) {
        return telegraf.Markup.inlineKeyboard([
            telegraf.Markup.button.callback("Accept", accept),
            telegraf.Markup.button.callback("Decline", decline)
        ])
    }
}

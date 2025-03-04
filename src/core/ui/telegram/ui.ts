import { getConfig, getInitialConfig } from '@core/config'
import { AvailableUIsEnum, AvailableUIsType, IUI, mapCommands } from '@core/ui/types';
import { FilesWrapper, Manager } from '@core/db';
import { IBuilderMarkupOption, ICmdHandlerResponce, ICmdRegisterMany, MotherCmdHandler } from '@core/command-handler';
import { WithInit } from '@core/types/with-init';

import { DefaultTgUICommands } from './constants/commands';
import { cb_data, actions, stickers } from './constants';
import { TgContext } from "./types";

import { LockManager } from '@utils/lock-manager';
import log from '@utils/logger';

import crypto from 'crypto'
import * as telegraf from 'telegraf'
import chalk from 'chalk';
import { anyToString } from '@core/utils/misc';

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
        this.bot.action(RegExp("builder_*"), async (ctx) => {
            console.log("~ACTI----------")
            const action = String(ctx.match.input.slice("builder_".length));
            const response = await this.cmdHandler.handleCommand(action, ctx as any);

            await this.commandResultReply(ctx, response);

            await ctx.deleteMessage();
        });
    }

    // NOTE: check text length for each btn and select correct perline for each row(after determine max line len)
    private createKeyboard(markup: IBuilderMarkupOption[], perLine = 3) {
        let arr: Array<Array<IBuilderMarkupOption>> = []
        for (let i = 0; i < markup.length; i += perLine) {
            arr.push(
                markup.slice(i, i + perLine).map(m => 
                    telegraf.Markup.button.callback(m.text, "builder_"+m.callback_data)
                )
            )
        }
        return arr
    }

    private async commandResultReply(ctx: telegraf.Context, response: ICmdHandlerResponce) {
        const layout = response.markup ? this.createKeyboard(response.markup) : [];
        let keyboard = telegraf.Markup.inlineKeyboard(layout)
        if (response.text || response.markup) {
            await ctx.reply(String(response.text), keyboard);
        }
    }

    private async setupCommands() {
        if (this.isInitialized()) {
            throw new Error("TelegemUI::init() already inited")
        }

        if (!this.cmdHandler.isInitialized()) {
            throw new Error("TelegemUI::init() command handler not inited")
        }

        const commands = this.cmdHandler.mapHandlersToUICommands();

        // assign commands
        commands.forEach(cmd => {
            log.echo(`-- Assigning command: "${chalk.bold(cmd.command)}"`)
            this.bot.command(cmd.command, async (ctx) => {
                try {
                    const response = await this.cmdHandler.handleCommand(cmd.command, ctx);
                    await this.commandResultReply(ctx, response);
                } catch (e: any) {
                    await ctx.reply(`Internall error: ${anyToString(e)}`);
                    log.error(`Command "${cmd.command}" "${ctx.manager.userId}" error: ${anyToString(e)}`, e);
                }
                console.log("@COMM----------")
            });
        })

        // handle builder handler execution
        this.bot.on("text", async (ctx) => {
            console.log("TEXT")
            const firstWord = ctx.text?.split(" ")[0]
            const fullText = ctx.text ? ctx.text : ""
            if (
                firstWord &&
                    firstWord.startsWith("/") &&
                    DefaultTgUICommands.map(c => c.command).includes(firstWord)
            ) {
                // deligate to native handler assigned with bot.command
                return
            }
            try {
                const response = await this.cmdHandler.handleCommand(fullText, ctx)
                if (response.markup) {
                    for (const action of response.markup) {
                        console.log(action)
                        this.bot.action(action.callback_data, async (ctx) => {
                            console.log("))))))))))")
                            await this.cmdHandler.handleCommand(action.callback_data, ctx as any);

                            await ctx.editMessageText(action.text, telegraf.Markup.inlineKeyboard([]));
                        })
                    }
                }
                await this.commandResultReply(ctx, response);
            } catch (e: any) {
                await ctx.reply(`Internall error: ${anyToString(e)}`);
                log.error(`Command "${firstWord}" "${ctx.manager.userId}" error: ${anyToString(e)}`, e);
            }
            console.log("#TEXT----------")
        })

        const toAssignCmds = mapCommands(DefaultTgUICommands).concat(commands).map(cmd =>
            ({ command: cmd.command, description: cmd.description })
        )

        this.verifyCommands(toAssignCmds)
        log.echo(`Commands verified ${chalk.green("successfully")}. Total commands: ${chalk.bold(toAssignCmds.length)}`)

        const maped = DefaultTgUICommands.map(
            cmd => ({
                command: {
                    command: cmd.command,
                    description: cmd.description,
                    args: cmd.args
                },
                mixin: cmd.fn.bind(this)
            }))

        this.cmdHandler.registerMany(maped as ICmdRegisterMany<TgContext>)
        this.cmdHandler.done()

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

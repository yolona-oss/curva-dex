import { getConfig, getInitialConfig } from '@core/config'
import { IUI } from '@core/ui/types';
import { AvailableUIsEnum, AvailableUIsType } from '..';
import { FilesWrapper, Manager } from '@core/db';
import { WithInit } from '@core/types/with-init';

import { TelegramUI_BuiltIns, toRegister } from './constants/commands';
import { cb_data, actions } from './constants';
import { TgContext } from "./types";

import { LockManager } from '@utils/lock-manager';
import log from '@logger';

import crypto from 'crypto'
import * as telegraf from 'telegraf'
import chalk from 'chalk';
import { anyToString } from '@core/utils/misc';
import { IUICommandProcessed } from '@core/ui/types/command';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { UiUnicodeSymbols } from '@core/ui/ui-unicode-symbols';
import { fromTgContext } from '@core/db/schemes/messages-history';

import { CHComposer, IHandleCommandResult } from '@core/ui/cmd-traspiler';
import { IBaseMarkup } from '@core/ui/cmd-traspiler/types/markup';

//async function tg_deleteMesasge(bot: telegraf.Telegraf<TgContext>, message_id: number, chat_id: number) {
//    await bot.telegram.deleteMessage(chat_id, message_id);
//}

export class TelegramUI extends WithInit implements IUI<TgContext> {

    static UserIdFromCtx(ctx: TgContext): string {
        const id = String(ctx.manager.userId)
        if (!id || id.length == 0) {
            throw new Error(`${this.caller.name}:=>:${this.name }: Cannot get user id from ctx: ${JSON.stringify(ctx, null, 2)}`)
        }
        return id
    }

    public readonly bot: telegraf.Telegraf<TgContext>
    private isActive: boolean = false;

    constructor(
        botApiKey: string,
        public readonly chComposer: CHComposer<TgContext>
    ) {
        super();
        this.bot = new telegraf.Telegraf(botApiKey);
    }

    private setCommandHandler(commands: IUICommandProcessed[]) {
        commands.forEach(cmd => {
            log.info(`-- Assigning command: "${chalk.bold(cmd.command)}"`)
            this.bot.command(cmd.command, async (ctx) => {
                log.trace("@COMM----------")
                await this.handleInput(cmd.command, ctx.text, ctx);
            });
        })
    }

    private async setupActions() {
        this.bot.action(RegExp(cb_data.approveRequest + "*"), (ctx, next) => actions.approverequest.call(this, ctx, next));
        this.bot.action(RegExp(cb_data.approveManager + "*"), (ctx, next) => actions.approvemanager.call(this, ctx, next));
        this.bot.action(RegExp(cb_data.rejectManager + "*"),  (ctx, next) => actions.rejectmanager.call(this, ctx, next));

        // handle builder buttons
        this.bot.action(RegExp("builder_*"), async (ctx) => {
            log.trace("~ACTI----------")
            const action = String(ctx.match.input.slice("builder_".length));
            log.trace(`Action input: `, [ctx.match.input, action])
            const res = await this.chComposer.handleCommand(action, action, ctx as any);
            await this.replyByCommandResult(ctx as any, res);
            await ctx.deleteMessage();
        });
    }

    private setTextHandler() {
        this.bot.on('message', async (ctx, next) => {
            log.trace("#TEXT----------")
            const firstWord = ctx.text?.split(" ")[0]
            const fullText = ctx.text ? ctx.text : ""
            const asCommand = firstWord?.slice(1) ?? "";
            const isCommandAlike = firstWord && firstWord.startsWith("/");
            log.trace(`Text input: "[First word: "${firstWord}"; Full text: "${fullText}"; As command: "${asCommand}"; Is command alike: "${isCommandAlike}"]`)
            await this.handleInput(isCommandAlike ? asCommand : fullText, fullText, ctx as TgContext);

            if (next) {
                return await next()
            }
        })
    }

    private async setupCommands() {
        if (this.isInitialized()) {
            throw new Error("TelegemUI::init() already inited")
        }

        if (!this.chComposer.isInitialized()) {
            throw new Error("TelegemUI::init() command handler not inited")
        }

        // apply builtin tg commands to cmd handler
        const tgCommands = this.registerTgComands()
        const commands = this.chComposer.toUICommands().concat(tgCommands.map(cmd => cmd.command) as IUICommandProcessed[])

        this.verifyCommands(commands)
        log.info(`Commands verified ${chalk.green("successfully")}. Total commands: ${chalk.bold(commands.length)}`)

        this.setCommandHandler(commands)
        this.setTextHandler()

        // assign to autocomplete
        await this.bot.telegram.setMyCommands(commands)

        this.setInitialized()
    }

    private async setupReplyRedifinition() {
        //this.bot.use(async (ctx, next) => {
        //    const originalReply = ctx.reply.bind(ctx);
        //
        //    ctx.reply = async (...args: Parameters<telegraf.Context["reply"]>) => {
        //        const message = args[0]?.toString();
        //
        //        const manager = await Manager.findById(ctx.manager.id)
        //        const dto = fromTgContext(ctx)
        //        await manager!.appendMessageHistory(dto)
        //
        //        return originalReply(...args); // Call the original reply function
        //    };
        //    await next()
        //})
    }

    private async setupAuth() {
        // Authorization
        this.bot.use(async (ctx, next) => {
            const manager = await Manager.findOne({ userId: ctx.from!.id })
            if (manager) {
                ctx.type = AvailableUIsEnum.Telegram
                ctx.manager = manager;
                return await next();
            } else if (ctx.updateType == 'callback_query') {
                //@ts-ignore
                if (ctx.update.callback_query.data.includes(cb_data.approveRequest)) {
                    return next();
                }
            }
            log.info(cb_data.approveRequest + " " + ctx.from!.id)
            const botName = (await getConfig()).bot.name
            await ctx.replyWithMarkdownV2(`Welcome to ${botName}. To start using bot you need to be aproved by bot administrator.\n" +
"Click on button for send approve request`,
                telegraf.Markup.inlineKeyboard([ [ { text: "Send", callback_data: cb_data.approveRequest + " " + ctx.from!.id  }, ] ]));
        })
    }

    private async setupHistorySave() {
        this.bot.on('message', async function(ctx, next) {
            if (ctx.manager) {
                const manager = await Manager.findById(ctx.manager.id)
                if (manager) {
                    await manager.appendMessageHistory(fromTgContext(ctx as TgContext))
                }
            } else if (ctx.message.from.is_bot) {
                // TODO be pretty to use OPC :>
                const manager = await Manager.findById(ctx.chat.id)
                if (manager) {
                    await manager.appendMessageHistory({
                        chatId: ctx.chat!.id,
                        userId: manager.userId,
                        message_id: ctx.message?.message_id,
                        text: ctx.text ?? "",
                        timestamp: ctx.message?.date ? ctx.message.date : undefined 
                    })
                }
            } else {
                log.debug(`No manager in ctx for saving message history. user: ${ctx.from?.id}, chat: ${ctx.chat?.id}, message: ${ctx.message?.message_id}`)
            }
            return await next()
        })

        this.bot.on('edited_message', async function(ctx, next) {
            const mamanger = await Manager.findById(ctx.manager.id)
            if (mamanger) {
                await mamanger.appendMessageHistory(fromTgContext(ctx as TgContext))
            } else {
                log.debug(`No manager in ctx for editing history message. user: ${ctx.from?.id}, chat: ${ctx.chat?.id}`)
            }
            if (next) {
                return await next()
            }
        })
    }

    private async setup() {
        await this.setupAuth()
        await this.setupHistorySave()
        await this.setupReplyRedifinition()
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
                log.info("Creating admin...")
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
            log.info("Starting Telegram-bot service...")
            this.bot.launch(() => {
                log.info("Telegram-bot service launched!")
            });
            if (adminExisted) {
                log.info("Sending welcome message to admins...")
                for (let manager of await Manager.find()) {
                    if (!manager.useGreeting) {
                        continue
                    }
                    await this.notifyManagers(manager.userId, `${UiUnicodeSymbols.info} Service now online`);
                }
            }
            log.info("** Telegram-bot service started");
        } catch(e) {
            throw new Error("TelegemUI::run() " + e);
        }

        this.bot.catch(async function(err, ctx) {
            await ctx.reply(`${UiUnicodeSymbols.error} Internall tg-service error:\n -- ${anyToString(err)}`);
        })

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
            if (!manager.useGreeting) { continue }
            await this.notifyManagers(manager.userId, `${UiUnicodeSymbols.info} Service going offline`)
        }
        await this.chComposer.stopAllServices()
        this.bot.stop();
        log.info("** Telegram ui stopped");
    }

    // Append builtin telegram command to command handler

    private registerTgComands() {
        const commands = TelegramUI_BuiltIns.map(toRegister)
        commands.forEach((c) => this.chComposer.unBoundRegister(c)) // why dont work? commands.forEach(this.chComposer.unBoundRegister)
        return commands
    }

    // VV UTILITY VV

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

    // Commands handlers utility

    // NOTE: check text length for each btn and select correct perline for each row(after determine max line len)
    private createKeyboard(markup: IBaseMarkup, perLine = 3) {
        let arr: Array<Array<InlineKeyboardButton.CallbackButton>> = []
        const mk_options = markup.buttons
        if (!mk_options) {
            return [[]]
        }
        for (let i = 0; i < mk_options.length; i += perLine) {
            arr.push(
                mk_options.slice(i, i + perLine).filter(m => m.type != 'aux').map(m => 
                    telegraf.Markup.button.callback(
                        m.text,
                        "builder_"+m.data
                    )
                )
            )
        }

        const defaultMkArray: Array<InlineKeyboardButton.CallbackButton> = []
        mk_options.filter(m => m.type == 'aux').forEach(m => {
            defaultMkArray.push(
                telegraf.Markup.button.callback(`${UiUnicodeSymbols.gear} ${m.text}`, "builder_"+m.data)
            )
        })
        return arr.concat([defaultMkArray])
    }

    private async replyByCommandResult(ctx: TgContext, response: IHandleCommandResult) {
        const layout = response.markup ? this.createKeyboard(response.markup) : [];
        let keyboard = telegraf.Markup.inlineKeyboard(layout)
        const sendText = response.markup?.text
        if (sendText && sendText.length) {
            await ctx.reply(sendText, keyboard);
        } else {
            log.debug(`Command "NOT IMPLEMENTED" "${TelegramUI.UserIdFromCtx(ctx)}" has no text to send`)
        }
    }

    private async handleInput(input: string, userText: string, ctx: TgContext) {
        try {
            const response = await this.chComposer.handleCommand(input, userText, ctx);
            await this.replyByCommandResult(ctx, response);
        } catch (e: any) {
            await ctx.reply(`TelegramUI::handleCmd error: ${anyToString(e)}`);
            log.error(`Command "${input}" "${TelegramUI.UserIdFromCtx(ctx)}" error: ${anyToString(e)}`, e);
        }
    }

    // VV Specials VV

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

    consolePrintCommands(): void {
        let cmdString = ''
        for (const cmd of this.chComposer.toUICommands()) {
            cmdString += ` -- ${cmd.command} - ${cmd.description}\n`
        }
        log.info(cmdString)
    }

}

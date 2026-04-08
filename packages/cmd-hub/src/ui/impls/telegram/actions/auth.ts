import { CqContext } from "@core/ui/impls/telegram/types";
import { getInitialConfig } from "@core/config";
import { Manager, FilesWrapper } from "@core/db";

import { TelegramUI } from "../telegram-ui";
import { auth_cb_prefix, decodeCbData } from "./../constants/callback";

import * as tg from "telegraf";

export async function sendJoinRequestToAdmin(this: TelegramUI, ctx: CqContext, next: () => void) {
    let id = decodeCbData.auth.joinReqRedirection(ctx.match.input)
    let keyboard = tg.Markup.inlineKeyboard([
        [
            {
                text: "Approve",
                callback_data: auth_cb_prefix.approveJoinRequest + " " + id
            },
            {
                text: "Reject",
                callback_data: auth_cb_prefix.rejectJoinRequest + " " + id
            }
        ]
    ])

    await ctx.telegram.sendMessage(getInitialConfig().bot.admin_id, "Approve request from @" + ctx.from!.username,
        keyboard);
    next();
}

export async function approveJoinRequest(this: TelegramUI, ctx: CqContext, next: () => void) {
    let userId = Number(
        decodeCbData.auth.joinReqApprove(ctx.match.input)
    )
    let member = await this.bot.telegram.getChatMember(userId, userId);
    await Manager.create({
        userId: userId,
        name: member.user.first_name + " " + member.user.last_name,
        avatar: (await FilesWrapper.getDefaultAvatar())!.id,
        useGreeting: true
    })

    await this.bot.telegram.sendMessage(userId, "Your request have been accepted. Now you are can use this bot");
    next();
}

export async function rejectJoinRequest(this: TelegramUI, ctx: CqContext, next: () => void) {
    let userId = Number(
        decodeCbData.auth.joinReqReject(ctx.match.input)
    )
    await this.bot.telegram.sendMessage(userId, "Your request have been rejected");
    next();
}

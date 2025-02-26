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
Object.defineProperty(exports, "__esModule", { value: true });
exports.actions = void 0;
const config_1 = require("@core/config");
const db_1 = require("@core/db");
const callback_1 = require("./callback");
const tg = __importStar(require("telegraf"));
exports.actions = (() => {
    async function approverequest(ctx, next) {
        let id = ctx.match.input.slice(callback_1.cb_data.approveRequest.length);
        let keyboard = tg.Markup.inlineKeyboard([
            [
                {
                    text: "Approve",
                    callback_data: callback_1.cb_data.approveManager + " " + id
                },
                {
                    text: "Reject",
                    callback_data: callback_1.cb_data.rejectManager + " " + id
                }
            ]
        ]);
        await ctx.telegram.sendMessage((await (0, config_1.getConfig)()).bot.admin_id, "Approve request from @" + ctx.from.username, keyboard);
        next();
    }
    async function approvemanager(ctx, next) {
        let userId = Number(ctx.match.input.slice(callback_1.cb_data.approveManager.length));
        let member = await this.tgBotInstance.telegram.getChatMember(userId, userId);
        await db_1.Manager.create({
            userId: userId,
            name: member.user.first_name + " " + member.user.last_name,
            avatar: (await db_1.FilesWrapper.getDefaultAvatar()).id,
            useGreeting: true
        });
        await this.tgBotInstance.telegram.sendMessage(userId, "Your request have been accepted. Now you are can use this bot");
        next();
    }
    async function rejectmanager(ctx, next) {
        let userId = Number(ctx.match.input.slice(callback_1.cb_data.rejectManager.length));
        await this.tgBotInstance.telegram.sendMessage(userId, "Your request have been rejected");
        next();
    }
    return {
        approverequest,
        approvemanager,
        rejectmanager
    };
})();

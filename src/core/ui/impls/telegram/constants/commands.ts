import { FilesWrapper, Manager } from '@core/db';

import { TelegramUI } from '../ui'
import { TgCommand, TextContext } from '../types'
import { shuffle } from '@core/utils/array';
import { CmdArgument } from '@core/ui/types/command';
import log from '@logger';
import { anyToString } from '@core/utils/misc';
import { ICmdRegisterEntry } from '@core/ui/cmd-traspiler';
import { BaseUIContext } from '@core/ui';
import { CmdArgumentProxy } from '@core/ui/cmd-traspiler/arg-proxy';

export function toRegister(cmd: TgCommand): ICmdRegisterEntry<BaseUIContext> {
    return {
        command: {
            command: cmd.command,
            description: cmd.description,
            args: cmd.args,
        },
        callback: cmd.callback
    }
}

const nameDict = [
    "Valentin",
    "Vladimir",
    "Gandonio",
    "Emperor",
    "Napoleon",
    "Napoleon\\ III",
    "Napoleon\\ IV",
    "Napoleon\\ V",
    "Napoleon\\ VI",
    "Napoleon\\ VII",
    "Napoleon\\ VIII",
    "Napoleon\\ IX",
    "Napoleon\\ X",
    "Napoleon\\ XI",
    "Napoleon\\ XII",
    "Napoleon\\ XIII",
    "Napoleon\\ XIV",
    "Joseph",
    "Pushkin",
    "Pussy",
    "Boba",
    "Boba\\ Fett",
    "Boba\\ Fett\\ II",
]

const StartCommand: TgCommand = {
    command: "start",
    description: "Start dummy command",
    callback: async function(this: TelegramUI, _, ctx) {
        await ctx.reply("Hello, dummy comman here :-)");
    }
}

class SetNameArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Your name, only latin symbols allowed",
        validator: (arg: string) => Boolean(arg.trim().match(/^[a-zA-Z0-9 ]+$/)) && arg.length <= 32 && arg.length >= 4,
        pairOptions: shuffle(nameDict).slice(0, 5)
    })
    name?: String
}

const SetNameCommand: TgCommand = {
    command: "setname",
    description: "Set your name",
    args: SetNameArgs,
    callback: async function(this: TelegramUI, args: CmdArgumentProxy, ctx) {
        const name = args.getOrThrow("name")

        await ctx.manager!.updateOne({ $set: { name: name } });
        await ctx.reply("Now your will called " + name);
    }
}

const SetAvatarFromAccountCommand: TgCommand = {
    command: "set_avatar_from_account",
    description: "Update your avatar from current on account",
    callback: async function(this: TelegramUI, _, ctx) {
        let photos = await (ctx as TextContext).telegram.getUserProfilePhotos((ctx as TextContext).from.id, 0, 1);
        let file   = await (ctx as TextContext).telegram.getFile(photos.photos[0][0].file_id);
        let url    = await (ctx as TextContext).telegram.getFileLink(file.file_id);
        let l_file = await FilesWrapper.saveFile(url.href, "avatars");
        if (l_file) {
            await ctx.manager!.updateOne({ $set: { avatar: l_file.id } });
        } else {
            await ctx.reply("Loading error. Try another time ^_^");
        }
    }
}

const GoOfflineCommand: TgCommand = {
    command: "gooffline",
    description: "Go offline",
    callback: async function(this: TelegramUI, _, ctx) {
        await ctx.manager!.updateOne({ $set: { online: false } });
    },
}

const GoOnlineCommand: TgCommand = {
    command: "goonline",
    description: "Go online",
    callback: async function(this: TelegramUI, _, ctx) {
        await ctx.manager!.updateOne({ $set: { online: true } });
    },
}

const StatusCommand: TgCommand = {
    command: "status",
    description: "Get your status",
    callback: async function(this: TelegramUI, _, ctx) {
        await ctx.reply("Your status: " + (ctx.manager!.online ? "online" : "offline"))
    }
}

class SetGreetingArgs {
    @CmdArgument({
        required: true,
        position: 1,
        description: "Disable or enable startup greeting",
        validator: (arg: string) => ["on", "off"].includes(arg),
        pairOptions: ["on", "off"]
    })
    greeting?: String
}

const SetGreetingCommand: TgCommand = {
    command: "setgreeting",
    description: "On or Off bot startup greeting",
    args: SetGreetingArgs,
    callback: async function(this: TelegramUI, args: CmdArgumentProxy, ctx) {
        const greeting = args.getOrThrow("greeting")

        await ctx.manager!.updateOne({ $set: { useGreeting: (greeting === 'on') } });
        await ctx.reply("Startup greeting setted to: " + greeting)
    }
}

const WipeChatCommand: TgCommand = {
    command: "wipe_chat",
    description: "Wipe all chat messages",
    args: [],
    callback: async function(this: TelegramUI, _, ctx) {
        const manager = await Manager.findById(ctx.manager!.id)
        if (manager) {
            const history = await manager.getMessagesHistory()
            for (const msg of history) {
                try {
                    await (ctx as TextContext).deleteMessage(msg.message_id!)
                } catch (e) {
                    log.error(`Wipe chat remove from ctx error: ${anyToString(e)}`)
                }
                try {
                    await manager.deleteMessage(msg.message_id!)
                } catch (e) {
                    log.error(`Wipe chat remove from history error: ${anyToString(e)}`)
                }
            }
        }

        ctx.reply("Chat wiped")
    }
}

export const TelegramUI_BuiltIns = [
    StartCommand,
    SetNameCommand,
    SetAvatarFromAccountCommand,
    GoOfflineCommand,
    GoOnlineCommand,
    StatusCommand,
    SetGreetingCommand,
    WipeChatCommand
]

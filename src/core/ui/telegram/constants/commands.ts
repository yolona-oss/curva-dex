import { FilesWrapper } from '@core/db';

import { TelegramUI } from '../ui'
import { TgCommand, TextContext } from '../types'
import { shuffle } from '@core/utils/array';

const nameDict = [
    "Valentin",
    "Vladimir",
    "Gandonio",
    "Emperor",
    "Napoleon",
    "Napoleon III",
    "Napoleon IV",
    "Napoleon V",
    "Napoleon VI",
    "Napoleon VII",
    "Napoleon VIII",
    "Napoleon IX",
    "Napoleon X",
    "Napoleon XI",
    "Napoleon XII",
    "Napoleon XIII",
    "Napoleon XIV",
    "Joseph",
    "Pushkin",
    "Pussy",
    "Boba",
    "Boba Fett",
    "Boba Fett II",
]

export const DefaultTgUICommands: TgCommand[] = [
    {
        command: "start",
        description: "Start dummy command",
        args: [],
        fn: async function(this: TelegramUI, _, ctx: TextContext) {
            await ctx.reply("Hello, dummy comman here :-)");
        }
    },
    {
        command: "setname",
        description: "Set your name",
        args: [
            {
                name: "name",
                optional: false,
                optType: "none",
                description: "Your name, only latin symbols allowed",
                validator: (arg: string) => Boolean(arg.trim().match(/^[a-zA-Z0-9 ]+$/)),
                options: shuffle(nameDict).slice(0, 5)
            }
        ],
        fn: async function(this: TelegramUI, args: string[], ctx: TextContext) {
            const name = args[0];
            if (name && name.length > 0) {
                await ctx.manager.updateOne({ $set: { name: name } });
                await ctx.reply("Now your will called " + name);
            } else {
                await ctx.replyWithMarkdownV2('No string passed, try: __"/setname The Emperor"__');
            }
        }
    },
    {
        command: "set_avatar_from_account",
        description: "Update your avatar from current on account",
        args: [],
        fn: async function(this: TelegramUI, _: string[], ctx: TextContext) {
            let photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id, 0, 1);
            let file   = await ctx.telegram.getFile(photos.photos[0][0].file_id);
            let url    = await ctx.telegram.getFileLink(file.file_id);
            let l_file = await FilesWrapper.saveFile(url.href, "avatars");
            if (l_file) {
                await ctx.manager.updateOne({ $set: { avatar: l_file.id } });
            } else {
                await ctx.reply("Loading error. Try another time ^_^");
            }
        }

    },
    {
        command: "gooffline",
        description: "Go offline",
        args: [],
        fn: async function(this: TelegramUI, _, ctx: TextContext) {
            await ctx.manager.updateOne({ $set: { online: false } });
        },
    },
    {
        command: "goonline",
        description: "Go online",
        args: [],
        fn: async function(this: TelegramUI, _, ctx: TextContext) {
            await ctx.manager.updateOne({ $set: { online: true } });
        },
    },
    {
        command: "status",
        description: "Get your status",
        args: [],
        fn: async function(this: TelegramUI, _, ctx: TextContext) {
            await ctx.reply("Your status: " + (ctx.manager.online ? "online" : "offline"))
        }
    },
    {
        command: "setgreeting",
        description: "On or Off bot startup greeting",
        args: [
            {
                name: "greeting",
                optional: false,
                optType: "none",
                description: "On or Off",
                validator: (arg: string) => ["on", "off"].includes(arg),
                options: ["on", "off"]
            }
        ],
        fn: async function(this: TelegramUI, args: string[], ctx: TextContext) {
            const greeting = args[0];
            await ctx.manager.updateOne({ $set: { useGreeting: (greeting === 'on') } });
            await ctx.reply("Startup greeting setted to: " + (ctx.manager.useGreeting ? "on" : "off"))
        }
    }
]

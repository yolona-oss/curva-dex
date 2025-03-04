import { IUICommand } from "@core/ui/types";

import { TgContext } from "./context";
import { TelegramUI } from "../ui";

import { NarrowedContext, Types } from "telegraf";

export type TextContext = NarrowedContext<TgContext, Types.MountMap['text']>;

export interface TgCommand extends IUICommand<TelegramUI, TextContext> {
    fn: (this: TelegramUI, ctx: TextContext) => Promise<void>;
}

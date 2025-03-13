import { BaseUIContext, IArgumentCompiled, ICallbackType, IUICommand } from "@core/ui/types";

import { TgContext } from "./context";
import { TelegramUI } from "../ui";

import { NarrowedContext, Types } from "telegraf";

export type TextContext = NarrowedContext<TgContext, Types.MountMap['text']>;

// SAME ICSUE AS WITH BUILT-IN-COMMAND
export interface TgUICommand<Ctx extends BaseUIContext = BaseUIContext> extends IUICommand {
    callback: (this: TelegramUI, args: IArgumentCompiled[], ctx: Ctx) => Promise<void>;
}

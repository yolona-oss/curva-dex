import { BaseUIContext, IArgumentCompiled, ICallbackType, IUICommand } from "@core/ui/types";

import { TgContext } from "./context";
import { TelegramUI } from "../ui";

import { NarrowedContext, Types } from "telegraf";
import { CmdArgumentProxy } from "@core/ui/cmd-traspiler/arg-proxy";

export type TextContext = NarrowedContext<TgContext, Types.MountMap['text']>;

// SAME ICSUE AS WITH BUILT-IN-COMMAND
export interface TgUICommand<Ctx extends BaseUIContext = BaseUIContext> extends IUICommand {
    callback: (this: TelegramUI, args: CmdArgumentProxy, ctx: Ctx) => Promise<void>;
}

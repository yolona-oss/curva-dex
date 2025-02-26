import { IManager } from "@core/db";
import { AvailableUIsEnum, BaseUIContext } from "@core/ui/types";

import { NarrowedContext, Context, Types } from "telegraf";

export interface TgContext extends Context, BaseUIContext {
    type: AvailableUIsEnum.Telegram
    manager: IManager
    text: string
    reply: (...args: any[]) => Promise<any>
}

export type CqContext = NarrowedContext<
        TgContext & { match: RegExpExecArray; },
        Types.MountMap['callback_query']
    >;

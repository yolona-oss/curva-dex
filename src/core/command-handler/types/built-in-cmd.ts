import { BaseUIContext, IUICommand } from "@core/ui";
import {CHComposer } from "../ch-composer";

export interface BuiltInCommand<UICtx extends BaseUIContext = BaseUIContext> extends IUICommand<any, UICtx> {
    exec: (this: CHComposer<UICtx>, args: string[], ctx: UICtx) => Promise<void>;
}

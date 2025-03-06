import { BaseUIContext, IUICommand } from "@core/ui";
import { MotherCmdHandler } from "../mother-cmd-handler";

export interface BuiltInCommand<UICtx extends BaseUIContext = BaseUIContext> extends IUICommand<any, UICtx> {
    exec: (this: MotherCmdHandler<UICtx>, args: string[], ctx: UICtx) => Promise<void>;
}

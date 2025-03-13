import { BaseUIContext, IArgumentCompiled, ICallbackType, IUICommand } from "@core/ui";
import { CHComposer } from "../ch-composer";

// TODO: create base class to not dot this. ITS CREATED ONLY CAUSE IUICommandCallback use args fields as parsed
interface IBuiltInCommandType<Ctx extends BaseUIContext = BaseUIContext> extends IUICommand {
    callback: ICallbackType<Ctx>;
}

export interface BuiltInCommand<UICtx extends BaseUIContext = BaseUIContext> extends IBuiltInCommandType<UICtx> {
    callback: (this: CHComposer<UICtx>, args: IArgumentCompiled[], ctx: UICtx) => Promise<void>;
}

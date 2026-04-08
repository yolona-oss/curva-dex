import { CmdArgument } from "@core/ui/types/command"
import { CmdDispatcher } from "../dispatcher"
import { BuiltInCommand } from "../types/built-in-cmd"
import { CmdArgumentProxy } from "../arg-proxy"

import { BaseUIContext, UiUnicodeSymbols } from "@core/ui"

import { MessageBonder } from "@core/ui/command-processor/msg-bonder"

export class ServicePannelArgs {
    @CmdArgument({
        required: false,
        position: 1,
        description: "Command name",
        pairOptions: async (_, handler) => {
            const services = handler.getRegistredServiceNames()
            const commands = handler.getRegistredCommandNames()
            return services.concat(commands)
        }
    })
    command!: String
}

export const ServicePannelCommand: BuiltInCommand = {
    command: "dashboard",
    description: "Show dashboard",
    args: new ServicePannelArgs,
    invokable: async function(this: CmdDispatcher<BaseUIContext>, args, ctx, uiImpl) {
        const setupForCmd = args.getPos(1)
        const msgBonder = new MessageBonder(uiImpl, String(ctx.manager.userId))

        if (setupForCmd) {
            await msgBonder.attach(`Dashboard for command: ${setupForCmd}`)
        } else {
            await msgBonder.attach(`Dashboard for user: ${ctx.manager.userId}`)
        }

        //await msgBonder.update
    }
}

// type CtrlPanelHandler = ()

class CtrlPanel<UICtxType extends BaseUIContext> {
    private dispatcher: CmdDispatcher<UICtxType>

    constructor(
        dispatcher: CmdDispatcher<UICtxType>,
        forCmd?: string
    ) {
        this.dispatcher = dispatcher
    }

    handleDeligatedCommand(command: string, userText: string, ctx: UICtxType, uiImpl: any) {
        return this.dispatcher.handleCommand(command, userText, ctx, uiImpl)
    }
    
    handlePanelCommand() {
        
    }
}

class CtrlPanelModel {

    constructor(

    ) {

    }


}

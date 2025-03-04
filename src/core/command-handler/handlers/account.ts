import { BuiltInAccountCommandsEnum } from "../constants"
import { AbstractCmdHandler, BaseUIContext, ICmdHandlerRequest, ICmdHandlerResponce } from "./abstract-handler"
import { Account } from "@core/db"

export class HandleAccountCommand<Ctx extends BaseUIContext> extends AbstractCmdHandler<Ctx> {
    public async handle(request: ICmdHandlerRequest<Ctx>): Promise<ICmdHandlerResponce> {

        console.log("HANDLE ACCOUNT CMD")

        const { command, userId, args, currentCmdHandler, uiCtx } = request

        if (!uiCtx.manager?.account) {
            // NOTE: may be add account creation logic here?
            return {
                success: false,
                text: "Account not defined."
            }
        }

        const account = await Account.findById(uiCtx.manager?.account)
        if (!account) {
            return {
                success: false,
                text: "Account not found."
            }
        }
        const module_name = args[0]
        const vname = args[1]
        const vvalue = args[2]

        switch (command) {
            case BuiltInAccountCommandsEnum.SET_VARIABLE:
                if (args.length < 3) {
                    return {
                        success: false,
                        text: "No module name or variable name or value passed"
                    }
                }

                await account!.setModuleData(module_name, vname, vvalue)

                return {
                    success: true,
                    text: "Variable setted. Current data for context:\n" + JSON.stringify(account.modules.find(m => m.module === module_name), null, 4)
                    }
            case BuiltInAccountCommandsEnum.REMOVE_VARIABLE:
                if (args.length < 2) {
                    return {
                        success: false,
                        text: "No module name or variable name passed"
                        }
                }

                await account.unsetModuleData(module_name, vname)

                return {
                    success: true,
                    text: "Variable unsetted"
                    }
            case BuiltInAccountCommandsEnum.GET_VARIABLE:
                if (args.length < 2) {
                    return {
                        success: false,
                        text: "No module name or variable name passed"
                    }
                }
                return {
                    success: true,
                    text: JSON.stringify(await account.getModuleData(module_name, vname), null, 4)
                    }
        }

        return super.handle(request)
    }
}

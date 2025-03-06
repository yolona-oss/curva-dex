import { CmdArgument } from "@core/ui/types/command"
import { BuiltInAccountCommandsEnum } from "../constants"
import { Account, Manager } from "@core/db"
import log from "@core/utils/logger"
import { BuiltInCommand } from "../types/built-in-cmd"
import { MotherCmdHandler } from "../mother-cmd-handler"

async function getAllUserModules(accountId: string): Promise<string[]> {
    const account = await Account.findById(accountId)
    if (!account) {
        log.error(`RemoveVarialbe::pairOptions Account ${accountId} not found`)
        return []
    }

    return account.modules.map(o => o.module)
}

class SetVariableArgs {
    @CmdArgument({
        required: true,
        standalone: true,
        description: "Module name",
        pairOptions: async (_, handler) => {
            return handler.getRegistredServiceNames()
        }
    })
    module!: String

    @CmdArgument({
        required: true,
        description: "Variable path",
        standalone: true,
        pairOptions: []
    })
    path!: String

    @CmdArgument({
        required: true,
        standalone: true,
        description: "Variable value",
        pairOptions: []
    })
    value!: String
}

const SetVariableCommand: BuiltInCommand = {
    command: BuiltInAccountCommandsEnum.SET_VARIABLE,
    description: "Create or update variable for user execution context",
    args: new SetVariableArgs(),
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
        const userId = String(ctx.manager!.userId)
        const user = await Manager.findOne({userId: Number(userId)})
        const account = await Account.findById(user!.account)
        if (!account) {
            throw `Account ${user!.account} not found. User: ${userId}`
        }

        const [module_name, path, value] = args
        await account.setModuleData(module_name, path, value)
        await ctx.reply(`Variable ${path} set to ${value}`)
    }
}

/////////////////////////

class RemoveVariableArgs {
    @CmdArgument({
        required: true,
        description: "Module name",
        standalone: true,
        pairOptions: async (_, __, owner) => {
            return await getAllUserModules(owner.account.toString())
        }
    })
    module!: String

    @CmdArgument({
        required: true,
        description: "Variable path",
        standalone: true,
        pairOptions: []
    })
    path!: String
}

/////////////////////////

const RemoveVariableCommand: BuiltInCommand = {
    command: BuiltInAccountCommandsEnum.REMOVE_VARIABLE,
    description: "Remove variable for user execution context",
    args: new RemoveVariableArgs(),
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
        const userId = String(ctx.manager!.userId)
        const user = await Manager.findOne({userId: Number(userId)})
        const account = await Account.findById(user!.account)
        if (!account) {
            throw `Account ${user!.account} not found. User: ${userId}`
        }

        const [module_name, path] = args
        await account.unsetModuleData(module_name, path)
        await ctx.reply(`Variable ${path} removed`)
    }
}

class GetVariableArgs {
    @CmdArgument({
        required: true,
        standalone: true,
        description: "Module name",
        pairOptions: async (_, __, owner) => {
            return await getAllUserModules(owner.account.toString())
        }
    })
    module!: String

    @CmdArgument({
        required: true,
        standalone: true,
        description: "Variable path",
        pairOptions: []
    })
    path!: String
}

const GetVariableCommand: BuiltInCommand = {
    command: BuiltInAccountCommandsEnum.GET_VARIABLE,
    description: "Get variable for user execution context",
    args: new GetVariableArgs(),
    exec: async function(this: MotherCmdHandler<any>, args: string[], ctx) {
        const userId = String(ctx.manager!.userId)
        const user = await Manager.findOne({userId: Number(userId)})
        const account = await Account.findById(user!.account)
        if (!account) {
            throw `Account ${user!.account} not found. User: ${userId}`
        }

        const [module_name, path] = args
        const value = await account.getModuleData(module_name, path)
        await ctx.reply(`Variable ${path} value: ${value}`)
    }
}

/////////////////////////

export {
    SetVariableCommand,
    RemoveVariableCommand,
    GetVariableCommand
}

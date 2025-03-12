import { CmdArgument } from "@core/ui/types/command"
import { BuiltInAliasCommandsEnum } from "../constants"
import {CHComposer } from "../ch-composer"
import { BuiltInCommand } from "../types/built-in-cmd"
import { CmdAlias } from "@core/db"
import { UiUnicodeSymbols } from "@core/ui"

export const MAX_ALIAS_NAME_LEN = 32

function isValidAliasName(alias: string) {
    return /^[a-zA-Z0-9_]+$/.test(alias)
}

class AliasArgs {
    @CmdArgument({
        required: true,
        standalone: true,
        description: "Alias name",
    })
    alias!: String

    @CmdArgument({
        required: true,
        standalone: true,
        description: "Command to alias",
    })
    command!: String
}

const AliasCommand: BuiltInCommand = {
    command: BuiltInAliasCommandsEnum.ALIAS_COMMAND,
    description: "Print help for concreet command",
    args: AliasArgs,
    exec: async function(this: CHComposer<any>, args: string[], ctx) {
        const aliasName = args[0]
        const commandStr = args.slice(1).join(" ")
        const owner_id = ctx.manager!._id

        if (!isValidAliasName(aliasName)) {
            throw `Alias name "${aliasName}" is not valid. It must be alphanumeric, numeric and underscore only`
        }
        if (aliasName.length > MAX_ALIAS_NAME_LEN) {
            throw `Alias name "${aliasName}" is too long. Max length is ${MAX_ALIAS_NAME_LEN}`
        }

        const aliases = await CmdAlias.find({owner_id})
        if (aliases.find(a => a.alias === aliasName)) {
            throw `Alias "${aliasName}" already exists`
        }
        await CmdAlias.create({alias: args[0], command: commandStr, owner_id})
    }
}

class UnAliasArgs {
    @CmdArgument({
        required: true,
        standalone: true,
        description: "Alias name to remove",
    })
    alias!: String
}

const UnaliasCommand: BuiltInCommand = {
    command: BuiltInAliasCommandsEnum.UNALIAS_COMMAND,
    description: "Unalias command",
    args: UnAliasArgs,
    exec: async function(this: CHComposer<any>, args: string[], ctx) {
        const aliasName = args[0]
        const owner_id = ctx.manager!._id

        const res = await CmdAlias.deleteOne({alias: aliasName, owner_id})
        if (res.deletedCount === 0) {
            throw `Alias "${aliasName}" not found`
        } else {
            await ctx.reply(`Alias "${aliasName}" removed`)
        }
    }
}

const ListAliases: BuiltInCommand = {
    command: BuiltInAliasCommandsEnum.LIST_ALIASES_COMMAND,
    description: "Show all user aliases",
    args: [],
    exec: async function(this: CHComposer<any>, _: string[], ctx) {
        const owner_id = ctx.manager!._id

        const aliases = await CmdAlias.find({owner_id})
        const aliasesStr = `Aliases for user "${owner_id}":\n` +
            aliases.map(a => ` -- <${a.alias}>: ${UiUnicodeSymbols.gear} "${a.command}"`).join("\n")
        await ctx.reply(aliasesStr)
    }
}

export {
    AliasCommand,
    UnaliasCommand,
    ListAliases
}

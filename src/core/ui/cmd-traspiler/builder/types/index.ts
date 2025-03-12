import { BaseCommandArgumentMetaDesc } from "@core/ui/types/command"
import { CmdArgumentContextType } from "@core/ui/types/command";

export interface ICommandArgumentDesc extends BaseCommandArgumentMetaDesc {
    ctx: CmdArgumentContextType,
    name: string,
    pairOptions?: string[]
}

export interface ICommandDescriptor {
    args: ICommandArgumentDesc[]
}

export interface ICompiledReadArg {
    ctx: CmdArgumentContextType
    position: number|null
    name: string
    value: string
}

import { CmdArgumentContextType } from "./context"
import { CmdArgumentMeta } from "./meta"

export type ArgumentDescriptorType = 'positional'|'pair'|'standalone'

/**
 * @description Defined argument descriptions to parse from raw input
 */
export interface IArgumentDescriptor extends CmdArgumentMeta {
    ctx: CmdArgumentContextType,
    name: string,
    pairOptions?: string[]
}

/**
 * @description Parsed argument, ready to use in command transpiler
 */
export interface IArgumentCompiled extends Pick<IArgumentDescriptor, 'ctx'|'name'|'standalone'> {
    value: string
    position: number|null
}

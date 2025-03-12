import { IManager } from '@core/db'
import { CHComposer } from '../ch-composer'
import { CmdArgumentPairOptionsType } from '@core/ui/types/command'

export * from './builder'
export * from './handler'

export type ArgOptionsSetter = (servName: string, composer: CHComposer<any>, manager: IManager) => Promise<string[]>
export type ArgOptionsType = CmdArgumentPairOptionsType<ArgOptionsSetter>
export type ArgOptionValidator = (arg: string) => boolean

import { IManager } from '@core/db'
import { MotherCmdHandler } from '../mother-cmd-handler'
import { CmdArgumentPairOptionsType } from '@core/ui/types/command'

export * from './builder'
export * from './handler'
export * from './service'

export type ArgOptionsSetter = (servName: string, o: MotherCmdHandler<any>, manager: IManager) => Promise<string[]>
export type ArgOptionsType = CmdArgumentPairOptionsType<ArgOptionsSetter>
export type ArgOptionValidator = (arg: string) => boolean

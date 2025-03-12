export * from './account-ctrl-cmd'
export * from './service-ctrl-cmd'
export * from './help-cmd'
export * from './sequence-cmd'
export * from './cmd-alias-ctlr'

import { BaseUIContext } from '@core/ui'
import { BuiltInSeqCommandsEnum, BuiltInHelpCommandsEnum, BuiltInAccountCommandsEnum, BuiltInServiceCommandsEnum } from '../constants'
import { ICmdRegisterEntry } from '../types'
import { BuiltInCommand } from '../types/built-in-cmd'
import { CHComposer } from '../ch-composer'

export const BuiltInCommandNames: string[] = Object.values(BuiltInSeqCommandsEnum)
                                                .concat(Object.values(BuiltInHelpCommandsEnum))
                                                .concat(Object.values(BuiltInAccountCommandsEnum))
                                                .concat(Object.values(BuiltInServiceCommandsEnum))

export function toRegister<UICtx extends BaseUIContext>(cmd: BuiltInCommand<UICtx>, composer: CHComposer<UICtx>): ICmdRegisterEntry<UICtx> {
    return {
        command: {
            command: cmd.command,
            description: cmd.description,
            args: cmd.args
        },
        mixin: cmd.exec.bind(composer)
    }
}

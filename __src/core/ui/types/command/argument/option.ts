// TODO some how create argument selection context for saveing prev selected arg to set next arg in one command.
//      e.g. for command set variable: set service_123 var1 path_to_some __jopa__. if pipe service name to next option selection we can asses to service config scope.

import { IManager } from "@core/db"
import { BaseUIContext } from "@core/ui"
import { CHComposer } from "@core/ui/cmd-traspiler"

type SetterPattern = (...args: any[]) => Promise<string[]>
export type CmdArgumentOptionSetter = (cmdName: string, composer: CHComposer<any>, manager: IManager) => Promise<string[]>
export type CmdArgumentPairOptionsType<OptionsSetter extends SetterPattern = CmdArgumentOptionSetter> = string[]|OptionsSetter

export async function exposeCmdArgumentOptions<CtxType extends BaseUIContext = any>(
    cmdName: string,
    options: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>|undefined,
    composer: CHComposer<CtxType>,
    manager: IManager
) {
    if (options instanceof Function) {
        return await options(cmdName, composer, manager)
    } else if (Array.isArray(options)) {
        return options
    } else {
        return undefined
    }
}

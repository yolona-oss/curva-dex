import { CmdDispatcher } from "@core/ui/command-processor"
import { IRunnable } from "@core/types/runnable"
import { WithInit } from "@core/types/with-init"
import { BaseUIContext } from "./context"
import { LockManager } from "@utils/lock-manager"
import { AvailableUIsType } from "./../impls"

export interface IUI<CtxType extends BaseUIContext> extends IRunnable, WithInit {
    readonly dispatcher: CmdDispatcher<CtxType>

    ContextType(): AvailableUIsType
    
    consolePrintCommands(): void

    lock(lockManager: LockManager): boolean
    unlock(lockManager: LockManager): boolean

    terminate(): Promise<void>
}

import { CHComposer } from "@core/command-handler"
import { IRunnable } from "@core/types/runnable"
import { WithInit } from "@core/types/with-init"
import { BaseUIContext } from "./context"
import { AvailableUIsType } from "./index"
import { LockManager } from "@utils/lock-manager"

export interface IUI<CtxType extends BaseUIContext> extends IRunnable, WithInit {
    readonly chComposer: CHComposer<CtxType>

    ContextType(): AvailableUIsType
    
    printCommands(): void

    lock(lockManager: LockManager): boolean
    unlock(lockManager: LockManager): boolean

    terminate(): Promise<void>
}

import { IRunnable } from "@core/types/runnable";
import { AbstractState } from "@core/types/state";
import { sleep } from "@utils/time";

export abstract class BaseTTikerState extends AbstractState<AbstractTTikerCtx> { }

export abstract class AbstractTTikerCtx {
    constructor(
        private state: BaseTTikerState
    ) {
        this.transitionTo(state)
    }

    public transitionTo(state: BaseTTikerState) {
        this.state = state
        this.state.setContext(this)
    }

    abstract tick(): Promise<void>
    abstract exit(): Promise<void>
}

export class TTicker implements IRunnable {
    private _isRunning: boolean = false
    private ctx: AbstractTTikerCtx
    private interval = 100

    constructor(ctx: AbstractTTikerCtx) {
        this.ctx = ctx
    }

    setState(state: BaseTTikerState) {
        this.ctx.transitionTo(state)
    }

    isRunning(): boolean {
        return this._isRunning
    }

    setInterval(interval: number) {
        this.interval = interval
    }

    async run() {
        if (this._isRunning) {
            throw new Error("Already running")
        }
        this._isRunning = true

        while (this._isRunning) {
            const startTime = performance.now()
            await this.ctx.tick()
            const elapsedTime = performance.now() - startTime

            if (elapsedTime < this.interval) {
                await sleep(this.interval - elapsedTime)
            }
        }
        await this.ctx.exit()
    }

    async terminate() {
        if (!this._isRunning) {
            throw new Error("Not running")
        }
        this._isRunning = false
    }
}

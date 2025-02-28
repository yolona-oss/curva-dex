import { IRunnable } from "@core/types/runnable";
import { AbstractState } from "@core/types/state";
import { sleep } from "@utils/time";

export abstract class BaseTTickerState extends AbstractState<AbstractTTickerCtx> { }

export abstract class AbstractTTickerCtx {
    constructor(
        private state: BaseTTickerState
    ) {
        this.transitionTo(state)
    }

    public transitionTo(state: BaseTTickerState) {
        this.state = state
        this.state.setContext(this)
    }

    abstract tick(): Promise<void>
    abstract exit(): Promise<void>
}

export class TTicker implements IRunnable {
    private _isRunning: boolean = false
    private ctx: AbstractTTickerCtx
    private interval = 100

    constructor(ctx: AbstractTTickerCtx) {
        this.ctx = ctx
    }

    setState(state: BaseTTickerState) {
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

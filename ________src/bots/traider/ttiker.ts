import { IRunnable } from "@core/types/runnable";
import { AbstractState } from "@core/types/state";
import { sleep } from "@utils/time";
import { IEventTradePayload } from "./impl/pump.fun/api/ev-impl";

export abstract class BaseTTickerState extends AbstractState<AbstractTTickerCtx<BaseTTickerState>> { }

export abstract class AbstractTTickerCtx<StateType extends BaseTTickerState> {
    constructor(
        protected state: StateType
    ) {
        this.transitionTo(state)
    }

    onmessage = (_: any) => {}

    public transitionTo(state: StateType) {
        this.state = state
        this.state.setContext(this)
    }

    abstract handleOtherTx(tx: any): Promise<void>

    abstract tick(): Promise<void>
    abstract exit(): Promise<void>
}

export class TTicker implements IRunnable {
    private _isRunning: boolean = false
    private _isPaused = false
    protected ctx: AbstractTTickerCtx<BaseTTickerState>
    private interval = 100

    constructor(ctx: AbstractTTickerCtx<BaseTTickerState>) {
        this.ctx = ctx
        this.ctx.onmessage = () => {}
    }

    pause() {
        this._isPaused = true
    }

    resume() {
        this._isPaused = false
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
            if (!this._isPaused) {
                await this.ctx.tick()
            }
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

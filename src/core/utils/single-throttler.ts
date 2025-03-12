import { sleep } from "./time"

export class SingleThrottler {
    private static instance!: SingleThrottler

    private constructor() {

    }

    static get Instance() {
        if (!this.instance) {
            this.instance = new SingleThrottler()
        }
        return this.instance
    }

    set SetThrottleDelay(throttleDelay: number) {
        if (throttleDelay <= 0) {
            throw new Error("ThrottleDelay must be greater than 0")
        }
        this.throttleDelay = throttleDelay
    }

    get ThrottleDelay() {
        return this.throttleDelay
    }

    private throttleMap: Map<string, number> = new Map<string, number>() // { actionGroup: lastExecutedTime }
    private throttleDelay: number = 1000

    public async throttle<T>(actionGroup: string, action: () => Promise<T>): Promise<T> {
        if (!this.throttleMap.has(actionGroup)) {
            this.throttleMap.set(actionGroup, Date.now())
        }

        const lastExecutedTime = this.throttleMap.get(actionGroup)!

        if (Date.now() - lastExecutedTime < this.throttleDelay) {
            await sleep(this.throttleDelay - (Date.now() - lastExecutedTime))
        }

        this.throttleMap.set(actionGroup, Date.now())

        return await action()
    }
}

import { BaseCommandService } from '@core/command-handler'
import { defaultServiceParamsMap } from '@core/command-handler/command-service'
import { genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'

export class TestService extends BaseCommandService {
    private max: number = 1000

    protected __serviceParamMap = defaultServiceParamsMap

    constructor(userId: string, input: string[], name: string = 'blob') {
        super(userId, {}, input, name)
    }

    parseInputParams(...args: string[]): string | void {
        const max = Number(args[0])
        if (max && max > 0) {
            this.max = max
        }
    }

    clone(userId: string, input: string[], newName?: string): BaseCommandService {
        return new TestService(userId, input, newName)
    }

    async runWrapper() {
        let i = 3n
        while (true) {
            if (!super.isRunning()) {
                break
            }
            this.emit("message", "blob" + i)
            i = i + genRandomNumberBetweenWithScatter(199n, 320n, 30n)
            await sleep(1000)
            if (i > this.max) {
                await this.terminate()
            }
        }
    }
}

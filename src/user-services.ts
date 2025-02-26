import { BaseCommandService } from '@core/command-handler'
import { genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'

export class TestService extends BaseCommandService<{}, string> {
    private max: number = 1000

    constructor(userId: string, name: string = 'blob') {
        super(userId, {}, name)
    }

    parseInputParams(...args: string[]): string | void {
        const max = Number(args[0])
        if (max && max > 0) {
            this.max = max
        }
    }

    clone(userId: string, newName?: string): BaseCommandService<{}, string> {
        return new TestService(userId, newName)
    }

    async run() {
        await super.run()

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

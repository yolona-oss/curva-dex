import { BaseCommandService } from '@core/command-handler'
import { BLANK_USER_ID } from '@core/command-handler'
import { defaultServiceParamsMap } from '@core/command-handler'
import { genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'

export class TestService extends BaseCommandService {
    private max = 1000n
    private i = 3n

    protected __serviceReceiveMsgArgs = {
        'pause': [],
        'resume': [],
        'stop': [],
        'reset': [],
        'setmax': ['value']
    }
    protected __serviceParamMap = defaultServiceParamsMap

    constructor(userId: string = BLANK_USER_ID, input: string[] = [], name: string = 'blob') {
        super(userId, {}, input, name)
    }

    private isPaused = false

    async receiveMsg(msg: keyof typeof this.__serviceReceiveMsgArgs, args: string[]): Promise<void> {
        if (msg === 'pause') {
            this.isPaused = true
        } else if (msg === 'resume') {
            this.isPaused = false
        } else if (msg === 'stop') {
            await this.terminate()
        } else if (msg == 'reset') {
            this.max = 1000n
            this.i = 3n
        } else if (msg === 'setmax') {
            if (args.length < 1 || Number.isNaN(Number(args[0]))) {
                this.sendMsg("Usage: setmax <max>")
                return
            }
            this.max = BigInt(args[0])
        }
    }

    clone(userId: string, input: string[], newName?: string): BaseCommandService {
        return new TestService(userId, input, newName)
    }

    async runWrapper() {
        while (true) {
            if (!super.isRunning()) {
                break
            }
            if (!this.isPaused) {
                this.emit("message", "blob" + this.i)
                this.i += genRandomNumberBetweenWithScatter(199n, 320n, 30n)
            }
            await sleep(1000)
            if (this.i > this.max) {
                await this.terminate()
            }
        }
    }

    async terminateWrapper() {
    }
}

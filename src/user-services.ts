import { BaseCommandService } from '@core/command-handler'
import { BLANK_USER_ID } from '@core/command-handler'
import { BaseServiceInteractMessages, ServiceData } from '@core/command-handler/service-data'
import { ArgMetadata } from '@core/command-handler/service-metadata'
import { genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'

const TestServiceName = 'test_service'

class TestServiceInteractMessages extends BaseServiceInteractMessages {
    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Pause service",
    })
    pause?: boolean

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Resume service",
    })
    resume?: boolean

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Stop service",
    })
    stop?: boolean

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Reset service",
    })
    reset?: boolean

    @ArgMetadata({
        required: false,
        standalone: false,
        description: "Set max value",
    })
    setmax?: number
}

export class TestService extends BaseCommandService {
    private max = 1000n
    private i = 3n

    constructor(
        userId: string = BLANK_USER_ID,
        serviceData: ServiceData = new ServiceData({}, {}, new TestServiceInteractMessages()),
        name: string = TestServiceName
    ) {
        super(userId, serviceData, name)
    }

    private isPaused = false

    async receiveMsg(msg: string, args: string[]): Promise<void> {
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

    clone(userId: string, serviceData: ServiceData, newName?: string): BaseCommandService {
        return new TestService(userId, serviceData, newName)
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

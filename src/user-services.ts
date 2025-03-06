import { BaseCommandService, IServiceSessionData } from '@core/command-handler'
import { BLANK_USER_ID } from '@core/command-handler'
import { BaseServiceConfig, BaseServiceInteractMessages, BaseServiceParameters, ServiceData } from '@core/command-handler/service-data'
import { CmdArgument } from '@core/ui/types/command'
import { genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'

const TestServiceName = 'test_service'

class TestServiceInteractMessages extends BaseServiceInteractMessages {
    @CmdArgument({
        required: false,
        standalone: true,
        description: "Pause service",
    })
    pause?: boolean

    @CmdArgument({
        required: false,
        standalone: true,
        description: "Resume service",
    })
    resume?: boolean

    @CmdArgument({
        required: false,
        standalone: true,
        description: "Stop service",
    })
    stop?: boolean

    @CmdArgument({
        required: false,
        standalone: true,
        description: "Reset service",
    })
    reset?: boolean

    @CmdArgument({
        required: false,
        standalone: false,
        description: "Set max value",
    })
    setmax?: number
}

interface TestServiceSessionData extends IServiceSessionData {
    prev_max?: number
}

export class TestService extends BaseCommandService<TestServiceSessionData, BaseServiceConfig, BaseServiceParameters, TestServiceInteractMessages> {
    private max = 1000n
    private i = 3n

    constructor(
        userId: string = BLANK_USER_ID,
        serviceData: ServiceData<BaseServiceConfig, BaseServiceParameters, TestServiceInteractMessages> = new ServiceData<BaseServiceConfig, BaseServiceParameters, TestServiceInteractMessages>({}, {}, new TestServiceInteractMessages()),
        name: string = TestServiceName
    ) {
        super(userId, serviceData, name)
        console.log(this.receiveMsgDescriptor())
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

    clone(userId: string, serviceData?: ServiceData, newName?: string): BaseCommandService<TestServiceSessionData> {
        return new TestService(userId, serviceData, newName)
    }

    async runWrapper() {
        this.emit('message', `Start with ${this.i}, target value ${this.max}, prev target: ${this.session_data.prev_max ?? 0}`)
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
        await this.setSessionDataValue("prev_max", this.max)
    }
}

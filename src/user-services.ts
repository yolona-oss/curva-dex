import { BaseCommandService } from '@core/ui/types/command/service'
import { BaseCmdServiceConfig, BaseCmdServiceInteractMessages, BaseCmdServiceParameters, CmdServiceData } from '@core/ui/types/command/service'

import { BLANK_USER_ID } from '@core/ui/command-processor'
import { CmdArgument } from '@core/ui/types/command'
import { genRandomNumber, genRandomNumberBetween, genRandomNumberBetweenWithScatter } from '@utils/random'
import { sleep } from '@utils/time'
import log from '@core/application/logger'

const TestServiceName = 'test_service'

type TestServiceDataType = CmdServiceData<
    BaseCmdServiceConfig,
    TestServiceParameters,
    TestServiceInteractMessages
>

class TestServiceInteractMessages extends BaseCmdServiceInteractMessages {
    @CmdArgument({
        required: false,
        description: "Pause service",
    })
    pause?: boolean

    @CmdArgument({
        required: false,
        description: "Resume service",
    })
    resume?: boolean

    @CmdArgument({
        required: false,
        description: "Stop service",
    })
    stop?: boolean

    @CmdArgument({
        required: false,
        description: "Reset service",
    })
    reset?: boolean

    @CmdArgument({
        required: false,
        description: "Set max value",
    })
    setmax?: string
}

class TestServiceParameters extends BaseCmdServiceParameters {
    @CmdArgument({
        required: false,
        position: null,
        standalone: false,
        pairOptions: async () => new Array(10).fill(0).map(() => genRandomNumber(genRandomNumberBetween(1, 3)).toString()),
        defaultValue: "123",
        validator: (arg) => !Number.isNaN(Number(arg)),
        description: "Start value"
    })
    startValue?: string
}

const defaultTestServiceData: TestServiceDataType = new CmdServiceData<BaseCmdServiceConfig, TestServiceParameters, TestServiceInteractMessages>(
    {},
    new TestServiceParameters(),
    new TestServiceInteractMessages()
)

interface TestServiceSessionData {
    prev_max?: number
}

export class TestService extends BaseCommandService<TestServiceSessionData, BaseCmdServiceConfig, TestServiceParameters, TestServiceInteractMessages> {
    private max = 5000n
    private i = 3n

    constructor(
        userId: string = BLANK_USER_ID,
        input: Partial<CmdServiceData<BaseCmdServiceConfig, BaseCmdServiceParameters, TestServiceInteractMessages>> = {},
        name: string = TestServiceName
    ) {
        super(userId, defaultTestServiceData, input, name)
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

    clone(userId: string, input: Partial<TestServiceDataType>, newName?: string): BaseCommandService<TestServiceSessionData> {
        return new TestService(userId, input, newName)
    }

    async runWrapper() {
        this.i = BigInt(this.data.params.startValue ?? 1)
        this.sendMsg(`Start with ${this.i}, target value ${this.max}, prev target: ${this.data.sessionData.prev_max ?? 0}`)
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
        try {
            await this.setSessionDataValue("prev_max", this.max)
        } catch (e) {
            log.error(`Cannot set session data for "${this.name}": `, e)
            throw `Cannot set session data for "${this.name}": ${e}`
        }
    }
}

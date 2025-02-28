import { BaseCommandService } from "@core/command-handler";

import { IPumpFunRobotConfig, defaultCfg } from "./pf-config";

import { defaultServiceParamsMap, IDefaultServiceParams, IDefaultServiceSessionData } from "@core/command-handler/command-service";
import { PumpFunRobot } from "./pf-robot";
import { BLANK_USER_ID } from "@core/command-handler/command-handler";
import { IMTCStateSave } from "@bots/traider/mtc";
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun";

export const serviceName = 'pump_fun'
export const serviceDescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`
export const serviceParams = ["-s <session-id>", "--session-id <session-id>", '-dry-run']

interface IPumpFunRobotParams extends IDefaultServiceParams {
    '--dry-run': null
}
const pumpFunParamsMap: IPumpFunRobotParams = {
    ...defaultServiceParamsMap,
    '--dry-run': null
}

interface IServiceSessionData extends IDefaultServiceSessionData {
    master_state_save: IMTCStateSave<PumpFunAssetType>
}

/**
 * From up to down order 
 *          |
 *          V
 *
 * 1. inited - input parsed and config loaded
 * 2. distribute - all slaves distributed
 * 3. initial_buy - all initial buys done
 * 4. ready - all preparing ops done and 
 * 5. run - main loop
 * 6. collect - all collecting ops done
 * 7. end - nothing to do
 */
export type IPumpFunRobotSessionState = "ready" | "inited" | "distribute" | "initial_buy" | "collect" | "end" | "run"

export class PumpFunRobot_service extends BaseCommandService<IPumpFunRobotConfig, IPumpFunRobotParams, IServiceSessionData> {
    protected __serviceParamMap: IPumpFunRobotParams = pumpFunParamsMap;

    // @ts-ignore
    private robot: PumpFunRobot

    constructor(
        userId: string = BLANK_USER_ID,
        inputParam: string[] = [],
        config: Partial<IPumpFunRobotConfig> = defaultCfg,
        name: string = serviceName
    ) {
        const _config = {...defaultCfg, ...config}
        super(
            userId,
            _config,
            inputParam,
            name,
        )
    }

    clone(userId: string, inputParam: string[], newName: string = serviceName) {
        return new PumpFunRobot_service(userId, inputParam, Object.assign({}, this.config), newName)
    }

    async receiveMsg(_: string, __: string[]): Promise<void> {

    }

    protected async runWrapper() {
        this.isBlankSession()

        const master_state_save = this.session_data.master_state_save
        this.robot = new PumpFunRobot(
            this.createServicePrefix(),
            this.config.targetAsset,
            this.config,
            this.isBlankSession() ? null : master_state_save
        )

        await this.robot.Initialize()
        await this.robot.start()
    }

    async terminateWrapper() {
        await this.robot.stop()
        const session_data = this.robot.toSave()
        this.setSessionDataValue('master_state_save', session_data)
    }

}

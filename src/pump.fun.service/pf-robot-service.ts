import { BaseCommandService } from "@core/command-handler";

import { IBCPS_Config, defaultCfg } from "./pf-config";

import { defaultServiceParamsMap, IDefaultServiceParams, IDefaultServiceSessionData } from "@core/command-handler/command-service";
import { PumpFunRobot } from "./pf-robot";

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
    slaves_id: string[],
}

export class PumpFunRobot_service extends BaseCommandService<IBCPS_Config, IPumpFunRobotParams, IServiceSessionData> {
    protected __serviceParamMap: IPumpFunRobotParams = pumpFunParamsMap;

    private robot: PumpFunRobot

    constructor(userId: string, inputParam: string[] = [], config: Partial<IBCPS_Config> = defaultCfg, name: string = serviceName) {
        const _config = {...defaultCfg, ...config}
        super(
            userId,
            _config,
            inputParam,
            name,
        )

        this.robot = new PumpFunRobot(
            this.createServicePrefix(),
            this.userId,
            this.config.targetAsset,
            this.config
        )
    }

    clone(userId: string, inputParam: string[], newName: string = serviceName) {
        return new PumpFunRobot_service(userId, inputParam, Object.assign({}, this.config), newName)
    }

    protected async runWrapper() {

        //await this.createSlaves(this.config.traiders.count, slaveTraider_Signature)
        //await this.createSlaves(this.config.holders.count, slaveHolder_Signature)
        //await this.createSlaves(this.config.volatile.count, slaveVolatile_Signature)
        //await this.distribute()
        //await this.initialBuy()
        //
        //await this.imitateTxs()
    }

    async terminateWrapper() {
        //await this.terminateImitateTxs()
    }

}

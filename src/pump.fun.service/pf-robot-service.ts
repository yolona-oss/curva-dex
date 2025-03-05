import { BaseCommandService, IDefaultServiceParametersOpts, IServiceSessionData } from "@core/command-handler";

import { IPumpFunRobotConfig, defaultCfg } from "./pf-config";

import { PumpFunRobot } from "./pf-robot";
import { BLANK_USER_ID } from "@core/command-handler";
import { IMTCStateSave } from "@bots/traider/mtc";
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun";
import { CmdArgumentDef, CmdArgumentOptionsType } from "@core/ui/types/command";
import { genRandomString } from "@core/utils/random";
import { IExtendedOptsMapEntry, IExtendedOptsMapEntryParsed } from "@core/utils/opts-parser";
import { BaseServiceInteractMessages, ServiceData } from "@core/command-handler/service-data";
import { ArgMetadata } from "@core/command-handler/service-metadata";

export const serviceName = 'pump_fun'
export const serviceDescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`

export const serviceArgs = []

interface IPumpFunRobotParameters extends IDefaultServiceParametersOpts {
    dryRun?: boolean
}

interface IPFServiceSessionData extends IServiceSessionData {
    state: IPumpFunRobotSessionState
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
 * 6. end - nothing to do
 *
 * ...
 *
 * pause - pause the robot
 */
export type IPumpFunRobotSessionState = "ready" | "inited" | "distribute" | "initial_buy" | "end" | "run" | "pause"

export const stateTransiteMap: Record<IPumpFunRobotSessionState, IPumpFunRobotSessionState[]> = {
    'inited': ['distribute', 'end'],
    'distribute': ['initial_buy', 'end'],
    'initial_buy': ['run', 'end'],
    'ready': ['run', 'end'],
    'run': ['pause', 'end'],
    'end': ['inited'],
    'pause': ['run', 'end'],
}

export type IPumpFunRobotMessageReceiveType = "pause" | "resume" | "stop" | "sell-all"

export class PumpFunService extends BaseCommandService {

    private robot?: PumpFunRobot

    constructor(
        userId: string = BLANK_USER_ID,
        serviceData: ServiceData = new ServiceData({}, {}, new BaseServiceInteractMessages()),
        name: string = serviceName
    ) {
        super(
            userId,
            serviceData,
            name,
        )
    }

    clone(userId: string, serviceData: ServiceData, newName: string = serviceName) {
        return new PumpFunService(userId, serviceData, newName)
    }

    async receiveMsg(msg: string, __: string[]): Promise<void> {
        if (!this.robot) {
            this.emit("message", "Not initialized")
            return
        }
        try {
            switch (msg) {
                case 'pause':
                    await this.robot.pause()
                    this.emit("message", "Paused")
                    break
                case 'resume':
                    await this.robot.resume()
                    this.emit("message", "Resumed")
                    break
                case 'stop':
                    await this.robot.stop()
                    this.emit("message", "Stopped")
                    break
                case 'sell-all':
                    await this.robot.sellAll()
                    this.emit("message", "Sold all")
                    break
            }
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : e
            this.emit("message", msg)
        }
    }

    protected async runWrapper() {
        //const master_state_save = this.session_data.master_state_save
        //const dryRun = this.data.params.dryRun ? true : false
        //this.robot = new PumpFunRobot(
        //    this.createServicePrefix(),
        //    //this.config.targetAsset,
        //    //this.config,
        //    this.isBlankSession() ? null : master_state_save,
        //    dryRun
        //)

        //await this.robot.Initialize()
        //await this.robot.start()
    }

    async terminateWrapper() {
        if (!this.robot) {
            this.emit("message", "Not initialized")
            return
        }
        await this.robot.stop()
        const session_data = this.robot.toSave()
        await this.setSessionDataValue('master_state_save', session_data.master)
        await this.setSessionDataValue('state', session_data.state)
    }

}

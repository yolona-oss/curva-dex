import { BaseCommandService, IDefaultServiceParamsDefEntry } from "@core/command-handler";

import { IPumpFunRobotConfig, defaultCfg } from "./pf-config";

import { defaultServiceParamsMapDef, IDefaultServiceParams, IDefaultServiceSessionData } from "@core/command-handler";
import { PumpFunRobot } from "./pf-robot";
import { BLANK_USER_ID } from "@core/command-handler";
import { IMTCStateSave } from "@bots/traider/mtc";
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun";
import { CmdArgumentDef, CmdArgumentOptionsType } from "@core/ui/types/command";
import { genRandomString } from "@core/utils/random";
import { IExtendedOptsMapEntry, IExtendedOptsMapEntryParsed } from "@core/utils/opts-parser";

export const serviceName = 'pump_fun'
export const serviceDescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`
export const serviceParams: CmdArgumentDef[] = [
    {
        name: "-s <session-id>",
        optional: true,
        optType: "string",
        description: "Session id to restore state from. Must be 4 chars long",
        validator: (arg: string) => Boolean(arg.match(/^[0-9a-z]{4}$/)),
        options: new Array<string>(4).fill('').map(() => genRandomString(4))
    },
    {
        name: "-session-id <session-id>",
        optional: true,
        optType: "string",
        description: "Session id to restore state from. Must be 4 chars long",
        validator: (arg: string) => Boolean(arg.match(/^[0-9a-z]{4}$/)),
        options: new Array<string>(4).fill('').map(() => genRandomString(4))
    },
    {
        name: '-dry-run',
        optional: true,
        optType: "none",
        description: "Run in dry mode"
    },
]

interface IPumpFunRobotParamsEntry extends IDefaultServiceParamsDefEntry { }

const pumpFunParamsMap: IPumpFunRobotParamsEntry[] = {
    ...serviceParams.map(p => ({
        name: p.name,
        argType: p.optType as "string" | "number" | "none",
        argOptions: p.options
    })),
    ...defaultServiceParamsMapDef,
}

interface IServiceSessionData extends IDefaultServiceSessionData {
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
stateTransiteMap

export type IPumpFunRobotMessageReceiveType = "pause" | "resume" | "stop" | "sell-all"

export class PumpFunRobot_service extends BaseCommandService<IPumpFunRobotConfig, IPumpFunRobotParamsEntry[], IServiceSessionData> {
    protected __serviceParamMap: IPumpFunRobotParamsEntry[] = pumpFunParamsMap;
    protected __serviceReceiveMsgArgs = {
        'pause': null,
        'resume': null,
        'stop': null,
        'sell-all': null,
    }

    private robot?: PumpFunRobot

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

    clone(userId: string, inputParam: string[], conf: Partial<IPumpFunRobotConfig> = {}, newName: string = serviceName) {
        const merge_conf = Object.assign({}, this.config, conf)
        return new PumpFunRobot_service(userId, inputParam, merge_conf, newName)
    }

    async receiveMsg(msg: keyof typeof this.__serviceReceiveMsgArgs, __: string[]): Promise<void> {
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
        const master_state_save = this.session_data.master_state_save
        this.robot = new PumpFunRobot(
            this.createServicePrefix(),
            this.config.targetAsset,
            this.config,
            this.isBlankSession() ? null : master_state_save,
            Boolean(this.params.find(p => p.name === '--dry-run'))
        )

        await this.robot.Initialize()
        await this.robot.start()
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

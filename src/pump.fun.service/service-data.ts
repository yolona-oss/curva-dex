import { BaseCmdServiceConfig, BaseCmdServiceParameters, BaseCmdServiceInteractMessages, CmdServiceData } from "@core/ui/types/command/service"
import { defaultCfg, IPumpFunRobotConfig } from "./config"
import { IPumpFunRobotSessionState } from "./robot/state"
import { IMTCStateSave } from "@bots/traider/mtc"
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun"
import { CmdArgument } from "@core/ui"
import { IBaseDEXTradeAsset } from "@bots/traider"

export const pfname = 'pump_fun'
export const pfdescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`

export class PFConfigData extends BaseCmdServiceConfig implements IPumpFunRobotConfig {
    @CmdArgument({
        required: false,
    })
    targetAsset!: IBaseDEXTradeAsset & { bondCurvMint: string }
}

export class PFParamsData extends BaseCmdServiceParameters {
    @CmdArgument({
        required: false,
        description: "Run the service in dry-run mode",
        standalone: true
    })
    dryRun?: string
}

export class PFMessagesData extends BaseCmdServiceInteractMessages {
    @CmdArgument({
        required: false,
        standalone: true,
        description: "Pause the robot",
    })
    pause?: void
}

export type PFServiceDataType = CmdServiceData<
    PFConfigData,
    PFParamsData,
    PFMessagesData,
    IPFServiceSessionData
>

export interface IPFServiceSessionData {
    state: IPumpFunRobotSessionState
    master_state_save: IMTCStateSave<PumpFunAssetType>
}

export type IPumpFunRobotMessageReceiveType = "pause" | "resume" | "stop" | "sell-all"

export const pfDefaultData: PFServiceDataType = new CmdServiceData(
    new PFConfigData,
    new PFParamsData,
    new PFMessagesData
)

import { BaseCmdServiceConfig, BaseCmdServiceParameters, BaseCmdServiceInteractMessages, CmdServiceData } from "@core/ui/types/command/service"
import { defaultCfg, IPumpFunRobotConfig } from "./config"
import { IPumpFunRobotSessionState } from "./robot/state"
import { IMTCStateSave } from "@bots/traider/mtc"
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun"

export const pfname = 'pump_fun'
export const pfdescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`

export class PFConfigData extends BaseCmdServiceConfig /*implements IPumpFunRobotConfig*/ {

}

export class PFParamsData extends BaseCmdServiceParameters {
}

export class PFMessagesData extends BaseCmdServiceInteractMessages {
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

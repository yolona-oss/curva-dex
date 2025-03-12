import { BaseCmdServiceConfig, BaseCmdServiceParameters, BaseCmdServiceInteractMessages, CmdServiceData } from "@core/command-handler/service-data"
import { defaultCfg, IPumpFunRobotConfig } from "./config"
import { IPumpFunRobotSessionState } from "./robot/state"
import { IMTCStateSave } from "@bots/traider/mtc"
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun"

export const name = 'pump_fun'
export const description = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`

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

interface IPFServiceSessionData {
    state: IPumpFunRobotSessionState
    master_state_save: IMTCStateSave<PumpFunAssetType>
}

export type IPumpFunRobotMessageReceiveType = "pause" | "resume" | "stop" | "sell-all"

export const pfDefaultData: PFServiceDataType = new CmdServiceData(
    new PFConfigData,
    new PFParamsData,
    new PFMessagesData
)

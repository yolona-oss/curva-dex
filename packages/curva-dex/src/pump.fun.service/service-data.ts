import { GlobalServiceConfig, GlobalServiceParam, GlobalServiceMessages, CmdServiceData } from "@core/ui/types/command/service"
import { IPumpFunRobotConfig } from "./config"
import { IPumpFunRobotSessionState } from "./robot/state"
import { IMTCStateSave } from "@bots/traider/mtc"
import { PumpFunAssetType } from "@bots/traider/impl/pump.fun"
import { CmdArgument } from "@core/ui"
import { IBaseDEXTradeAsset } from "@bots/traider"

export const pfname = 'pump_fun'
export const pfdescription = `Customizable servie for the pump.fun dex simulation activity and automated trading by setting a strategy schema.`

// implements Partial<IPumpFunRobotConfig> gives IDE autocompletion for all config fields.
// The type assertion below produces a build error listing any top-level keys
// from IPumpFunRobotConfig that are not yet declared here.
export class PFConfigData extends GlobalServiceConfig implements Partial<IPumpFunRobotConfig> {
    @CmdArgument({
        required: false,
    })
    targetAsset!: IBaseDEXTradeAsset & { bondCurvMint: string }
}

export class PFParamsData extends GlobalServiceParam {
    @CmdArgument({
        required: false,
        description: "Run the service in dry-run mode",
        standalone: true
    })
    dryRun?: string
}

export class PFMessagesData extends GlobalServiceMessages {
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

// Build error: shows missing key names from IPumpFunRobotConfig not declared in PFConfigData.
// When you add a new field to IPumpFunRobotConfig, the build breaks here until you add a
// corresponding @CmdArgument property to PFConfigData.
// Remove the `never &` prefix when all keys are covered.
type _UncoveredConfigKeys = Exclude<keyof IPumpFunRobotConfig, keyof PFConfigData>
type _AssertFullCoverage = [_UncoveredConfigKeys] extends [never]
    ? true
    : never & { missing: _UncoveredConfigKeys }

export const pfDefaultData: PFServiceDataType = new CmdServiceData(
    new PFConfigData,
    new PFParamsData,
    new PFMessagesData
)

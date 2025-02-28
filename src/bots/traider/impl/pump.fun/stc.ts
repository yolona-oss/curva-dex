import { Sequalizer } from "@utils/sequalizer";
import { SlaveTraderCtrl } from "../../stc";

import { PumpFunApi, PumpFunApiProvider } from "./api";
import { PumpFunAssetType } from "./asset-type";
import { IDEXWallet, ITraider } from "@bots/traider/types";
import { ToSaveData } from "@bots/traider/stc-metric";

export class PumpFunSlave extends SlaveTraderCtrl<PumpFunApi, PumpFunAssetType> {
    constructor(
        id: string,
        metricsSave: ToSaveData<PumpFunAssetType>|null,
        wallet: IDEXWallet,
        sequalizer: Sequalizer|null
    ) {
        super(
            id,
            PumpFunApiProvider as PumpFunApi,
            metricsSave,
            wallet,
            sequalizer
        )
    }

    clone(newId: string, metricsSave: ToSaveData<PumpFunAssetType>|null, newTraider: ITraider, sequalizer?: Sequalizer) {
        return new PumpFunSlave(newId, metricsSave, newTraider.wallet, sequalizer ?? this.sequalizer)
    }
}

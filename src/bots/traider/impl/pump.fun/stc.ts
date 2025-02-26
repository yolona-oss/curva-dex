import { Sequalizer } from "@utils/sequalizer";
import { SlaveTraderCtrl } from "../../stc";

import { PumpFunApi, PumpFunApiProvider } from "./api";
import { PumpFunAssetType } from "./asset-type";
import { IDEXWallet, ITraider } from "@bots/traider/types";

export class PumpFunSlave extends SlaveTraderCtrl<PumpFunApi, PumpFunAssetType> {
    constructor(
        id: string,
        owner: string,
        wallet: IDEXWallet,
        sequalizer?: Sequalizer
    ) {
        super(
            id,
            owner,
            PumpFunApiProvider as PumpFunApi,
            wallet,
            sequalizer
        )
    }

    clone(newId: string, newOwner: string, newTraider: ITraider, sequalizer?: Sequalizer) {
        return new PumpFunSlave(newId, newOwner, newTraider.wallet, sequalizer ?? this.sequalizer)
    }
}

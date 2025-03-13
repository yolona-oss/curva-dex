import { SlaveTraderCtrl } from "../../stc";
import { IDEXWallet, ITraider } from "@bots/traider/types";
import { Sequalizer } from "@utils/sequalizer";
import { ExExAssetType } from "./asset-type";
import { ExampleTradeApi } from "./api";

export class ExampleSlave extends SlaveTraderCtrl<ExampleTradeApi, ExExAssetType> {
    constructor(
        id: string,
        owner: string,
        wallet: IDEXWallet,
        sequalizer?: Sequalizer
    ) {
        super(id, owner, new ExampleTradeApi(), Object.assign({}, wallet), sequalizer)
    }

    clone(newId: string, newOwner: string, newTraider: ITraider, newSequalizer?: Sequalizer) {
        return new ExampleSlave(newId, newOwner, newTraider.wallet, newSequalizer)
    }
}

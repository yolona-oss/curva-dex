import { SlaveTraderCtrl } from "@bots/traider/stc";
import { MasterTraderCtrl } from "@bots/traider/mtc";
import { ExampleTradeApi } from "./api";
import { ExExAssetType } from "./asset-type";

export class ExampleMaster extends MasterTraderCtrl<ExampleTradeApi, ExExAssetType> {
    constructor(
        id: string,
        owner: string,
        asset: ExExAssetType,
        initialSalves?: Array<SlaveTraderCtrl<ExampleTradeApi, ExExAssetType>>
    ) {
        super(
            Object.assign({}, asset),
            new Array().concat(initialSalves ?? []),
            new ExampleTradeApi(),
            owner,
            id
        )
    }

    onTrade<TxData>(_: string, __: TxData): Promise<void> {
        throw new Error("Method not implemented.")
    }

    clone(id: string, newOwner: string, newAsset: ExExAssetType, newSlaves?: SlaveTraderCtrl<ExampleTradeApi, ExExAssetType>[]) {
        return new ExampleMaster(id, newOwner, newAsset, newSlaves ?? [])
    }
}

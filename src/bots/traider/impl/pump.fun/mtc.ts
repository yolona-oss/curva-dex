import { SlaveTraderCtrl } from "@bots/traider/stc";
import { MasterTraderCtrl } from "../../mtc";
import { PumpFunApi, PumpFunApiProvider } from "./api";
import { PumpFunAssetType } from "./asset-type";
import { IPumpFun_TxEventPayload } from "./api";
import { TradeSideConst } from "@bots/traider/types";
import { BLANK_MINT_PREFIX } from "./../built-in";

import log from '@utils/logger'
import { SolanaWalletManager } from "@bots/traider/wallet-manager";
import { ExCurveSaveTradePoints } from "@bots/traider/curve";

export class PumpFunMaster extends MasterTraderCtrl<PumpFunApi, PumpFunAssetType, SolanaWalletManager> {
    constructor(
        id: string,
        curveSaves: ({
            full: ExCurveSaveTradePoints,
            bots: ExCurveSaveTradePoints,
        })|null,
        asset: PumpFunAssetType,
        slaves?: SlaveTraderCtrl<PumpFunApi, PumpFunAssetType>[]
    ) {
        super(
            id,
            asset,
            curveSaves,
            slaves ?? [],
            PumpFunApiProvider as PumpFunApi,
            new SolanaWalletManager(),
        )

        if (asset.mint != BLANK_MINT_PREFIX) {
            log.echo(`PumpFunMaster subscribing to ${asset.mint}`)
            this.tradeApi.subscribeToAssetTrades(asset.mint, this.onTrade.bind(this))
        }
    }

    async onTrade<TxData = IPumpFun_TxEventPayload>(_: string, _tx: TxData): Promise<void> {
        const tx = _tx as IPumpFun_TxEventPayload

        const side = tx.isBuy ? TradeSideConst.Buy : TradeSideConst.Sell
        const tokens = tx.tokenAmount
        const sols = tx.solAmount

        const price = tokens / sols
        this.fullCurve.addTrade({
            sign: tx.signature,
            price,
            quantity: sols,
            side,
            time: tx.timestamp
        })
    }

    clone(newId: string, curveSaves: ({ full: ExCurveSaveTradePoints, bots: ExCurveSaveTradePoints })|null, newAsset: PumpFunAssetType, newSlaves?: SlaveTraderCtrl<PumpFunApi, PumpFunAssetType>[]) {
        return new PumpFunMaster(newId, curveSaves, newAsset, newSlaves ?? [])
    }
}

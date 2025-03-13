import { BaseTradeApi, IApiTradeResponce, TradeApiListnerType } from "../../base-trade-api";
import { IOffer } from "../../types"
import { IAssetInfo } from "../../types/asset"
import { HttpClient } from "@utils/network/http-client";
import { getInitialConfig } from "@core/config";
import { ExExAssetType } from "./asset-type";
import { genRandomNumberBetween } from "@utils/random";

export const MAIN_TOKEN_NAME = "exex-coin"

export class ExampleTradeApi extends BaseTradeApi<ExExAssetType> {
    constructor(_?: string) {
        super("example-trade-api");
    }

    clone() {
        return new ExampleTradeApi()
    }

    async assetInfo(asset: ExExAssetType): Promise<IAssetInfo> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.get('/target-info/' + asset.mint)
    }

    subscribeToAssetTrades<EventName extends string, TxData>(_: string, __: TradeApiListnerType<EventName, TxData>, ___?: any): Promise<void> {
        throw new Error("Method not implemented.")
    }

    unsubscribeFromAssetFromAllListners(_: string): void {
        throw new Error("Method not implemented.")
    }

    unsubscribeFromAssetTrades(_: string, __: TradeApiListnerType<any, any>): void {
        throw new Error("Method not implemented.")
    }

    async buy(opt: IOffer<ExExAssetType>): Promise<IApiTradeResponce<ExExAssetType>> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-buy', {
            traider: {
                wallet: opt.traider.wallet
            },
            maxSpent: opt.maxSpent,
            mint: opt.asset.mint
        })
    }

    async sell(opt: IOffer<ExExAssetType>): Promise<IApiTradeResponce<ExExAssetType>> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-sell', {
            traider: {
                wallet: opt.traider.wallet
            },
            maxSpent: opt.maxSpent,
            mint: opt.asset.mint
        })
    }

    async createAsset(asset: ExExAssetType, supply: number): Promise<void> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/create-target', {
            mint: asset.mint,
            symbol: asset.symbol,
            supply: supply,
            initialPrice: Number(genRandomNumberBetween(1, 100).toFixed(1))
        })
    }
}

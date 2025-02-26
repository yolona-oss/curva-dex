"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleTradeApi = exports.MAIN_TOKEN_NAME = void 0;
const base_trade_api_1 = require("../../base-trade-api");
const http_client_1 = require("@utils/network/http-client");
const config_1 = require("@core/config");
const random_1 = require("@utils/random");
exports.MAIN_TOKEN_NAME = "exex-coin";
class ExampleTradeApi extends base_trade_api_1.BaseTradeApi {
    constructor(_) {
        super("example-trade-api");
    }
    clone() {
        return new ExampleTradeApi();
    }
    async assetInfo(asset) {
        const cfg = (0, config_1.getInitialConfig)();
        const client = new http_client_1.HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform");
        return await client.get('/target-info/' + asset.mint);
    }
    subscribeToAssetTrades(_, __, ___) {
        throw new Error("Method not implemented.");
    }
    unsubscribeFromAssetFromAllListners(_) {
        throw new Error("Method not implemented.");
    }
    unsubscribeFromAssetTrades(_, __) {
        throw new Error("Method not implemented.");
    }
    async buy(opt) {
        const cfg = (0, config_1.getInitialConfig)();
        const client = new http_client_1.HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform");
        return await client.post('/place-buy', {
            traider: {
                wallet: opt.traider.wallet
            },
            maxSpent: opt.maxSpent,
            mint: opt.asset.mint
        });
    }
    async sell(opt) {
        const cfg = (0, config_1.getInitialConfig)();
        const client = new http_client_1.HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform");
        return await client.post('/place-sell', {
            traider: {
                wallet: opt.traider.wallet
            },
            maxSpent: opt.maxSpent,
            mint: opt.asset.mint
        });
    }
    async createAsset(asset, supply) {
        const cfg = (0, config_1.getInitialConfig)();
        const client = new http_client_1.HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform");
        return await client.post('/create-target', {
            mint: asset.mint,
            symbol: asset.symbol,
            supply: supply,
            initialPrice: Number((0, random_1.genRandomNumberBetween)(1, 100).toFixed(1))
        });
    }
}
exports.ExampleTradeApi = ExampleTradeApi;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePumpFunApi = void 0;
const types_1 = require("../../../types");
const base_trade_api_1 = require("../../../base-trade-api");
const logger_1 = __importDefault(require("@utils/logger"));
const swap_1 = require("./swap");
const utils_1 = require("@bots/traider/utils");
const solana_1 = require("@core/providers/solana");
const tx_parser_1 = require("./tx-parser");
const holders_fetcher_1 = require("./holders-fetcher");
const account_1 = require("./account");
const web3_js_1 = require("@solana/web3.js");
class BasePumpFunApi extends base_trade_api_1.BaseTradeApi {
    tokenPrices = new Map();
    constructor() {
        super("pump-fun");
    }
    lastInfoReqTime = 0;
    lastInfoReq;
    infoReqInterval = 500;
    async assetInfo(target) {
        const timeDiff = Date.now() - this.lastInfoReqTime;
        if (this.lastInfoReq && timeDiff < this.infoReqInterval) {
            return this.lastInfoReq;
        }
        this.lastInfoReqTime = Date.now();
        const bc = await account_1.AccountResolver.getBondingCurveAccount(new web3_js_1.PublicKey(target.mint));
        if (!bc) {
            return null;
        }
        const market_cap_sol = bc.getMarketCapSOL();
        const price = bc.getBuyPrice(1n);
        const info = {
            marketCap: market_cap_sol,
            tradesVolume: 0,
            price: price,
            supply: bc.tokenTotalSupply,
            holders: await this.getTokenHolders(target.mint),
            complete: bc.complete
        };
        this.lastInfoReq = info;
        return info;
    }
    async getTokenHolders(mint) {
        return await (0, holders_fetcher_1.getTokenHoldersFromHeliusApi)(mint);
    }
    async performOffer(offer, side) {
        const fn = side == types_1.TradeSideConst.Buy ? swap_1.pumpFunBuy : swap_1.pumpFunSell;
        let sign = "";
        const time = Date.now();
        try {
            sign = await fn(offer.traider.wallet.secretKey, offer.asset.mint, Number(offer.maxSpent), offer.fee, offer.slippagePerc);
        }
        catch (e) {
            logger_1.default.error(e);
            return {
                success: false
            };
        }
        const tx = await solana_1.SolanaProvider.Instance.Connection.getTransaction(sign, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            logger_1.default.error(`PumpFunTradeApi.performOffer() Transaction not found: ${sign}`);
            return { success: false };
        }
        const parsed = (0, tx_parser_1.parsePumpFunTx)(tx);
        if (!parsed) {
            logger_1.default.error(`PumpFunTradeApi.performOffer() Transaction not parsed: ${sign}`);
            return { success: false };
        }
        const preBalance = parsed.userPreLamportAmount;
        const postBalance = parsed.userPostLamportAmount;
        const preAssetBalance = parsed.preTokenAmount;
        const postAssetBalance = parsed.postTokenAmount;
        const token_in = side == types_1.TradeSideConst.Buy ?
            postAssetBalance - preAssetBalance :
            postBalance - preBalance;
        const token_out = side == types_1.TradeSideConst.Buy ?
            postBalance - preBalance :
            postAssetBalance - preAssetBalance;
        const assetPrice = (0, utils_1.priceCalc)(preBalance, postBalance, preAssetBalance, postAssetBalance);
        return ({
            commit: {
                time,
                asset: offer.asset,
                side,
                in: token_in,
                out: token_out,
                assetPrice,
                fee: {
                    priority: offer.fee,
                    base: BigInt(tx.meta.fee)
                },
                signature: sign,
                success: true,
            },
            success: true
        });
    }
    async buy(offer) {
        return await this.performOffer(offer, types_1.TradeSideConst.Buy);
    }
    async sell(offer) {
        return await this.performOffer(offer, types_1.TradeSideConst.Sell);
    }
    async createAsset(asset, supply) {
        asset;
        supply;
        throw new Error("Not implemented");
    }
}
exports.BasePumpFunApi = BasePumpFunApi;

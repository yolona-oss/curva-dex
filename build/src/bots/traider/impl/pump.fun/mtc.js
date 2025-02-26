"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunMaster = void 0;
const mtc_1 = require("../../mtc");
const api_1 = require("./api");
const types_1 = require("@bots/traider/types");
const built_in_1 = require("./../built-in");
const logger_1 = __importDefault(require("@utils/logger"));
const wallet_manager_1 = require("@bots/traider/wallet-manager");
class PumpFunMaster extends mtc_1.MasterTraderCtrl {
    constructor(id, owner, asset, slaves) {
        super(asset, slaves ?? [], api_1.PumpFunApiProvider, owner, new wallet_manager_1.SolanaWalletManager(), id);
        if (asset.mint != built_in_1.BLANK_MINT_PREFIX) {
            logger_1.default.echo(`PumpFunMaster subscribing to ${asset.mint}`);
            this.tradeApi.subscribeToAssetTrades(asset.mint, this.onTrade.bind(this));
        }
    }
    async onTrade(_, _tx) {
        const tx = _tx;
        const side = tx.isBuy ? types_1.TradeSideConst.Buy : types_1.TradeSideConst.Sell;
        const tokens = tx.tokenAmount;
        const sols = tx.solAmount;
        const price = tokens / sols;
        this.fullCurve.addTrade({
            sign: tx.signature,
            price,
            quantity: sols,
            side,
            time: tx.timestamp
        });
    }
    clone(newId, newOwner, newAsset, newSlaves) {
        return new PumpFunMaster(newId, newOwner, newAsset, newSlaves ?? []);
    }
}
exports.PumpFunMaster = PumpFunMaster;

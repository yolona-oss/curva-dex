"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunApi_SolImpl = void 0;
const solana_1 = require("@core/providers/solana");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const logger_1 = __importDefault(require("@utils/logger"));
const pool_state_1 = require("./../../pool-state");
const constants_1 = require("./../../constants");
const tx_parser_1 = require("./../../tx-parser");
const base_pump_fun_api_1 = require("./../../base-pump.fun-api");
const idl_json_1 = __importDefault(require("./idl.json"));
class PumpFunApi_SolImpl extends base_pump_fun_api_1.BasePumpFunApi {
    program;
    constructor(parentProgram) {
        super();
        this.program = parentProgram || new anchor_1.Program(idl_json_1.default, new anchor_1.AnchorProvider(solana_1.SolanaProvider.Instance.Connection, solana_1.SolanaProvider.Instance.DummyWallet, { commitment: "confirmed" }));
    }
    clone() {
        return new PumpFunApi_SolImpl(this.program);
    }
    async subscribeToAssetTradesV0(mint, listner) {
        const poolData = await (0, pool_state_1.getPoolState)(mint, solana_1.SolanaProvider.Instance.Connection);
        if (!poolData) {
            logger_1.default.error(`PumpFunApi.subscribeToAssetTrades() pool not found for token: ${mint}`);
            throw new Error("Pool not found");
        }
        const handlePumpTrade = async (logs, _, desire_mint) => {
            try {
                if (!logs.logs.includes(constants_1.PUMPFUN_BUY_LOG) ||
                    !logs.logs.includes(constants_1.PUMPFUN_SELL_LOG)) {
                    return null;
                }
                const tx = await solana_1.SolanaProvider.Instance.Connection.getTransaction(logs.signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                });
                if (tx == null) {
                    logger_1.default.warn(`Transaction not found for signature ${logs.signature}`);
                    return;
                }
                const parsed_tx = (0, tx_parser_1.parsePumpFunTx)(tx);
                if (parsed_tx?.mint.toString() === desire_mint) {
                    return parsed_tx;
                }
                return null;
            }
            catch (e) {
                logger_1.default.error(`handleLogs() error: ${e}`);
                return null;
            }
        };
        const sub_id = solana_1.SolanaProvider.Instance.Connection.onLogs(new web3_js_1.PublicKey(constants_1.PUMP_FUN_PROGRAM), async (logs, ctx) => {
            const tx_data = await handlePumpTrade(logs, ctx, mint);
            if (tx_data) {
                const event = "trade";
                const tx = tx_data;
                await listner(event, tx);
            }
        });
        if (!this.assetsSubs.has(mint)) {
            this.assetsSubs.set(mint, []);
        }
        this.assetsSubs.get(mint).push(sub_id, listner);
        return sub_id;
    }
    async subscribeToAssetTradesV1(mint, listner) {
        const poolData = await (0, pool_state_1.getPoolState)(mint, solana_1.SolanaProvider.Instance.Connection);
        if (!poolData) {
            logger_1.default.error(`PumpFunApi.subscribeToAssetTrades() pool not found for token: ${mint}`);
            throw new Error("Pool not found");
        }
        console.log("subed to: " + mint);
        const sub_id = this.program.addEventListener("tradeEvent", async (ev, _, sign) => {
            if (ev.mint.toString() === mint) {
                const remap = {
                    ...ev,
                    solAmount: BigInt(ev.solAmount.toString()),
                    tokenAmount: BigInt(ev.tokenAmount.toString()),
                    virtualSolReserves: BigInt(ev.virtualSolReserves.toString()),
                    virtualTokenReserves: BigInt(ev.virtualTokenReserves.toString()),
                    realSolReserves: BigInt(ev.realSolReserves.toString()),
                    realTokenReserves: BigInt(ev.realTokenReserves.toString()),
                    timestamp: ev.timestamp.toNumber(),
                    signature: sign
                };
                await listner("tradeEvent", remap);
            }
        });
        if (!this.assetsSubs.has(mint)) {
            this.assetsSubs.set(mint, []);
        }
        this.assetsSubs.get(mint).push(sub_id, listner);
        return sub_id;
    }
    async subscribeToAssetTrades(mint, listner) {
        return await this.subscribeToAssetTradesV1(mint, listner);
    }
    unsubscribeFromAssetTrades(mint, on_logs_sub_id) {
        if (!this.assetsSubs.has(mint)) {
            return;
        }
        const listners = this.assetsSubs.get(mint);
        if (listners.length < 2) {
            throw new Error("PumpFunApi_SolImpl.unsubscribeFromAssetTrades() trying to unsubscribe from non existing listner with mint: " + mint);
        }
        const sub_id_ind = listners.indexOf(on_logs_sub_id);
        const sub_id = listners[sub_id_ind];
        const listner = listners[sub_id_ind + 1];
        solana_1.SolanaProvider.Instance.Connection.removeOnLogsListener(sub_id);
        this.off(mint, listner);
    }
    unsubscribeFromAssetFromAllListners(mint) {
        if (!this.assetsSubs.has(mint)) {
            return;
        }
        this.assetsSubs.delete(mint);
        this.removeAllListeners(mint);
    }
}
exports.PumpFunApi_SolImpl = PumpFunApi_SolImpl;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunApi_PFStreamImpl = void 0;
const logger_1 = __importDefault(require("@utils/logger"));
const pool_state_1 = require("./../../pool-state");
const constants_1 = require("./../../constants");
const solana_1 = require("@core/providers/solana");
const base_pump_fun_api_1 = require("./../../base-pump.fun-api");
class PumpFunApi_PFStreamImpl extends base_pump_fun_api_1.BasePumpFunApi {
    static isSocketInited = false;
    static pf_socket;
    constructor() {
        super();
        if (!PumpFunApi_PFStreamImpl.isSocketInited) {
            PumpFunApi_PFStreamImpl.pf_socket = new WebSocket(constants_1.PUMP_FUN_SOCKET_API_URL);
            PumpFunApi_PFStreamImpl.isSocketInited = true;
            PumpFunApi_PFStreamImpl.pf_socket.onopen = () => {
                PumpFunApi_PFStreamImpl.pf_socket.send("40");
                logger_1.default.echo("Socket open");
            };
            PumpFunApi_PFStreamImpl.pf_socket.onclose = (e) => {
                if (e.code == 1000)
                    return;
            };
            PumpFunApi_PFStreamImpl.pf_socket.onerror = (e) => {
                const error = typeof e == "string" ? e : JSON.stringify(e, null, 4);
                logger_1.default.error(`PumpFunApi_PFStreamImpl.pf_socket.onerror() error: ${error}`);
            };
            PumpFunApi_PFStreamImpl.pf_socket.onmessage = (ev) => {
                console.log(ev.data);
                if (!ev.data) {
                    return;
                }
                if (ev.data == "2") {
                    PumpFunApi_PFStreamImpl.pf_socket.send("3");
                    return;
                }
                try {
                    const string = String(ev.data);
                    const num1 = string.slice(0, 1);
                    const num2 = string.slice(0, 2);
                    let toParse = "";
                    if (num1 == "0") {
                        toParse = string.slice(1);
                    }
                    else if (num2 == "40") {
                        toParse = string.slice(2);
                    }
                    if (toParse != "") {
                        const session_data = JSON.parse(toParse);
                        logger_1.default.echo(session_data);
                        return;
                    }
                    const tx_package = JSON.parse((ev.data).slice(2));
                    let tx_data = tx_package[1];
                    let tx_event = tx_package[0];
                    if (tx_event === "tradeCreated") {
                        tx_event = "trade";
                    }
                    tx_data.timestamp *= 1000;
                    const sol = tx_data.sol_amount;
                    const token = tx_data.token_amount;
                    this.tokenPrices.set(tx_data.mint, BigInt((token / sol).toFixed(0)));
                    this.emit(tx_data.mint, tx_event, tx_data);
                }
                catch (e) {
                    logger_1.default.error(ev.data);
                    logger_1.default.error(`PumpFunApi_PFStreamImpl.pf_socket.onmessage() error: ${e}`);
                }
            };
        }
    }
    clone() {
        return new PumpFunApi_PFStreamImpl();
    }
    async subscribeToAssetTrades(mint, listner) {
        const poolData = await (0, pool_state_1.getPoolState)(mint, solana_1.SolanaProvider.Instance.Connection);
        if (!poolData) {
            logger_1.default.error(`PumpFunApi_PFStreamImpl.subscribeToAssetTrades() pool not found for token: ${mint}`);
            throw new Error("Pool not found");
        }
        this.addListener(mint, async (event, tx) => {
            await listner(event, tx);
        });
        if (!this.assetsSubs.has(mint)) {
            this.assetsSubs.set(mint, []);
        }
        this.assetsSubs.get(mint).push(listner);
        return 0;
    }
    unsubscribeFromAssetTrades(mint, listner) {
        if (!this.assetsSubs.has(mint)) {
            return;
        }
        if (typeof listner == "number") {
            throw new Error("PumpFunApi_PFStreamImpl.unsubscribeFromAssetTrades() this implementation does not support unsubscribing by sub_id: " + listner);
        }
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
exports.PumpFunApi_PFStreamImpl = PumpFunApi_PFStreamImpl;

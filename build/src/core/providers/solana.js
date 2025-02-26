"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaProvider = exports.CONFIRM_TRANSACTION_INITIAL_TIMEOUT = exports.DEFAULT_COMMITMENT = exports.DEFAULT_FINALITY = exports.WS_END_POINT = exports.RPC_END_POINT = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = __importDefault(require("@utils/logger"));
const dotenv_1 = require("dotenv");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
(0, dotenv_1.configDotenv)();
exports.RPC_END_POINT = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
exports.WS_END_POINT = `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
exports.DEFAULT_FINALITY = "confirmed";
exports.DEFAULT_COMMITMENT = "confirmed";
exports.CONFIRM_TRANSACTION_INITIAL_TIMEOUT = 60 * 1000;
class SolanaProvider {
    conn;
    dummy_wallet;
    static instance;
    constructor() {
        logger_1.default.echo("SolanaProvider initialized with rpc end point: " + exports.RPC_END_POINT);
        this.conn = new web3_js_1.Connection(exports.RPC_END_POINT, {
            commitment: exports.DEFAULT_COMMITMENT,
            disableRetryOnRateLimit: false,
            wsEndpoint: exports.WS_END_POINT,
            confirmTransactionInitialTimeout: exports.CONFIRM_TRANSACTION_INITIAL_TIMEOUT
        });
        this.dummy_wallet = new nodewallet_1.default(new web3_js_1.Keypair());
        logger_1.default.echo("SolanaProvider initialized with dummy wallet: " + this.dummy_wallet.publicKey.toBase58());
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    get DummyWallet() {
        return this.dummy_wallet;
    }
    get Connection() {
        return this.conn;
    }
}
exports.SolanaProvider = SolanaProvider;

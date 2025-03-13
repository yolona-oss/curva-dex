import { Provider, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import log from '@logger' "@utils/logger";
import { configDotenv } from "dotenv";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

// TODO add config values

configDotenv()

export const RPC_END_POINT = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
export const WS_END_POINT = `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`

export const DEFAULT_FINALITY = "confirmed"
export const DEFAULT_COMMITMENT = "confirmed"
export const CONFIRM_TRANSACTION_INITIAL_TIMEOUT = 60 * 1000

export class SolanaProvider {
    private conn: Connection
    private dummy_wallet: any
    //private provider: Provider
    private static instance: SolanaProvider

    private constructor() {
        log.info("SolanaProvider initialized with rpc end point: " + RPC_END_POINT)
        this.conn = new Connection(RPC_END_POINT, {
            commitment: DEFAULT_COMMITMENT,
            disableRetryOnRateLimit: false,
            wsEndpoint: WS_END_POINT,
            confirmTransactionInitialTimeout: CONFIRM_TRANSACTION_INITIAL_TIMEOUT
        });
        this.dummy_wallet = new NodeWallet(new Keypair())
        log.info("SolanaProvider initialized with dummy wallet: " + this.dummy_wallet.publicKey.toBase58())
        //this.provider = new AnchorProvider(this.conn, )
    }

    static get Instance() {
        return this.instance || (this.instance = new this())
    }

    public get DummyWallet() {
        return this.dummy_wallet
    }

    public get Connection(): Connection {
        return this.conn
    }

    //public get Provider(): {
    //}
} 

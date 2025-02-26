"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaWalletManager = void 0;
const base_wallet_1 = require("./base-wallet");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const logger_1 = __importDefault(require("@utils/logger"));
const time_1 = require("@utils/time");
const spl_token_1 = require("@solana/spl-token");
const solana_1 = require("@core/providers/solana");
class SolanaWalletManager extends base_wallet_1.BaseWalletManager {
    connection;
    nativeCurrency = "LAMPORTS";
    constructor() {
        super();
        this.connection = solana_1.SolanaProvider.Instance.Connection;
    }
    decodeWallet(base64SecretKey) {
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(Buffer.from(base64SecretKey, 'base64')));
    }
    createWalletFromPrivateKey(privateKeyBase58) {
        const privateKeyBytes = Uint8Array.from(bs58_1.default.decode(privateKeyBase58));
        return web3_js_1.Keypair.fromSecretKey(privateKeyBytes);
    }
    async balance(wallet) {
        const ret = [];
        this.connection;
        const lamports = BigInt(await this.connection.getBalance(new web3_js_1.PublicKey(wallet.publicKey)));
        ret.push({
            mint: this.nativeCurrency,
            amount: lamports
        });
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(new web3_js_1.PublicKey(wallet.publicKey), {
            programId: new web3_js_1.PublicKey(spl_token_1.TOKEN_PROGRAM_ID),
        });
        for (const account of tokenAccounts.value) {
            if (account.account.data.parsed.info.isNative) {
                continue;
            }
            const balance = account.account.data.parsed.info.tokenAmount.amount;
            if (balance) {
                ret.push({
                    mint: account.account.data.parsed.info.mint,
                    amount: balance
                });
            }
        }
        return ret;
    }
    async createWallet() {
        const w = web3_js_1.Keypair.generate();
        return {
            publicKey: w.publicKey.toString(),
            secretKey: Buffer.from(w.secretKey).toString('base64')
        };
    }
    async collectFromOne(src, dst, rest) {
        try {
            const wallet = this.decodeWallet(src.secretKey);
            const balance = BigInt(await this.connection.getBalance(wallet.publicKey));
            const transferAmount = balance - (rest ?? 0n);
            if (transferAmount <= 0) {
                return {
                    success: false,
                    message: 'Insufficient balance for transfer'
                };
            }
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new web3_js_1.PublicKey(dst.publicKey),
                lamports: transferAmount,
            }));
            const signature = await this.connection.sendTransaction(transaction, [wallet]);
            await this.connection.confirmTransaction(signature);
            return {
                success: true,
                transferAmount
            };
        }
        catch (e) {
            return {
                success: false,
                message: e?.message
            };
        }
    }
    async collect(src, dst) {
        const ret = [];
        for (const wallet of src) {
            const { success, transferAmount, message } = await this.collectFromOne(wallet, dst);
            if (success) {
                ret.push({
                    publicKey: wallet.publicKey,
                    mint: this.nativeCurrency,
                    amount: transferAmount
                });
            }
            else if (message) {
                logger_1.default.error(`Error collecting from ${wallet.publicKey}: ${message}`);
            }
        }
        return ret;
    }
    async send(src, dst, amount) {
        const retries = 3;
        const srcWallet = this.decodeWallet(src.secretKey);
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                    fromPubkey: new web3_js_1.PublicKey(srcWallet.publicKey),
                    toPubkey: new web3_js_1.PublicKey(dst.publicKey),
                    lamports: amount,
                }));
                const signature = await this.connection.sendTransaction(transaction, [srcWallet]);
                await this.connection.confirmTransaction(signature);
                logger_1.default.echo(`sign: ${signature} <|> Distributed ${amount} lamports to ${dst.publicKey}`);
                return;
            }
            catch (err) {
                if (attempt === retries - 1)
                    throw err;
                if (err.message.includes('429')) {
                    await (0, time_1.sleep)(1000 * (attempt + 1));
                    continue;
                }
                throw err;
            }
        }
        throw new Error('Max retries reached');
    }
    async distribute(src, dst) {
        let ret = [];
        for (const destination of dst) {
            try {
                await this.send(src, destination.wallet, destination.amount);
                ret.push({
                    publicKey: destination.wallet.publicKey,
                    mint: this.nativeCurrency,
                    amount: destination.amount
                });
            }
            catch (e) {
                logger_1.default.error(`Error distributing to ${destination.wallet.publicKey}: ${e}`);
                ret.push({
                    publicKey: destination.wallet.publicKey,
                    mint: "LAMPORTS",
                    amount: 0n
                });
            }
        }
        return ret;
    }
}
exports.SolanaWalletManager = SolanaWalletManager;

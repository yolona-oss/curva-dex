"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryError = void 0;
exports.withRetry = withRetry;
exports.getKeyPairFromBase64SecretKey = getKeyPairFromBase64SecretKey;
exports.getKeyPairFromPrivateKey = getKeyPairFromPrivateKey;
exports.getCachedBlockhash = getCachedBlockhash;
exports.createTransaction = createTransaction;
exports.sendAndConfirmTransactionWrapper = sendAndConfirmTransactionWrapper;
exports.bufferFromUInt64 = bufferFromUInt64;
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
class RetryError extends Error {
    attempts;
    constructor(message, attempts) {
        super(message);
        this.attempts = attempts;
        this.name = 'RetryError';
    }
}
exports.RetryError = RetryError;
async function withRetry(operation, options = {}) {
    const { maxAttempts = 5, initialDelay = 500, maxDelay = 10000, factor = 2, jitter = true } = options;
    let attempt = 1;
    let delay = initialDelay;
    while (true) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt >= maxAttempts) {
                throw new RetryError(`Failed after ${attempt} attempts: ${error.message}`, attempt);
            }
            if (error?.response?.status !== 429 &&
                !error.toString().includes('429') &&
                !error.toString().includes('Too many requests')) {
                throw error;
            }
            const jitterDelay = jitter
                ? delay * (0.5 + Math.random())
                : delay;
            console.log(`Attempt ${attempt} failed. Retrying after ${Math.round(jitterDelay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, jitterDelay));
            delay = Math.min(delay * factor, maxDelay);
            attempt++;
        }
    }
}
function getKeyPairFromBase64SecretKey(base64SecretKey) {
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(Buffer.from(base64SecretKey, 'base64')));
}
async function getKeyPairFromPrivateKey(key) {
    return web3_js_1.Keypair.fromSecretKey(new Uint8Array(bs58_1.default.decode(key)));
}
let cachedBlockhash = null;
let blockhashExpirySlot = 0;
async function getCachedBlockhash(connection) {
    const currentSlot = await withRetry(() => connection.getSlot());
    if (!cachedBlockhash || currentSlot >= blockhashExpirySlot) {
        const latestBlockhash = await withRetry(() => connection.getLatestBlockhash());
        cachedBlockhash = latestBlockhash;
        blockhashExpirySlot = latestBlockhash.lastValidBlockHeight;
    }
    return cachedBlockhash.blockhash;
}
async function createTransaction(connection, instructions, payer, priorityFeeInSol = 0) {
    const modifyComputeUnits = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
    });
    const transaction = new web3_js_2.Transaction().add(modifyComputeUnits);
    if (priorityFeeInSol > 0) {
        const microLamports = priorityFeeInSol * 1_000_000_000;
        const addPriorityFee = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports,
        });
        transaction.add(addPriorityFee);
    }
    transaction.add(...instructions);
    transaction.feePayer = payer;
    transaction.recentBlockhash = await getCachedBlockhash(connection);
    return transaction;
}
async function sendAndConfirmTransactionWrapper(connection, transaction, signers) {
    try {
        const signature = await withRetry(() => (0, web3_js_2.sendAndConfirmTransaction)(connection, transaction, signers, {
            skipPreflight: true,
            preflightCommitment: 'confirmed',
            maxRetries: 3
        }));
        console.log('Transaction confirmed with signature:', signature);
        return signature;
    }
    catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
    }
}
function bufferFromUInt64(value) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
}

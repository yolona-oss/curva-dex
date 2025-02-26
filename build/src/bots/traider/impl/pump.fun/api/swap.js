"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pumpFunBuy = pumpFunBuy;
exports.pumpFunSell = pumpFunSell;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const solana_1 = require("@core/providers/solana");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("@core/utils/logger"));
const account_1 = require("./account");
async function pumpFunBuy(payerPrivateKey, mintStr, solIn, priorityFeeInSol = 0, slippageDecimal = 0.25) {
    try {
        const connection = solana_1.SolanaProvider.Instance.Connection;
        const bc = await account_1.AccountResolver.getBondingCurveAccount(new web3_js_1.PublicKey(mintStr));
        solana_1.SolanaProvider.Instance.Connection.confirmTransaction;
        const coinData = bc;
        const { bonding_curve, associated_bonding_curve } = await account_1.AccountResolver.getTokenBondingCurve(mintStr);
        if (!coinData) {
            throw new Error(`pumpFunBuy: Failed to retrieve coin data for ${mintStr}`);
        }
        const payer = await (0, utils_1.getKeyPairFromPrivateKey)(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new web3_js_1.PublicKey(mintStr);
        const txBuilder = new web3_js_1.Transaction();
        const tokenAccountAddress = await (0, utils_1.withRetry)(() => (0, spl_token_1.getAssociatedTokenAddress)(mint, owner, false));
        const tokenAccountInfo = await (0, utils_1.withRetry)(() => connection.getAccountInfo(tokenAccountAddress));
        let tokenAccount;
        if (!tokenAccountInfo) {
            txBuilder.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccountAddress, payer.publicKey, mint));
            tokenAccount = tokenAccountAddress;
        }
        else {
            tokenAccount = tokenAccountAddress;
        }
        const solInLamports = solIn * web3_js_1.LAMPORTS_PER_SOL;
        const tokenOut = Math.floor(solInLamports * Number(coinData.virtualTokenReserves) / Number(coinData.virtualSolReserves));
        const solInWithSlippage = solIn * (1 + slippageDecimal);
        const maxSolCost = Math.floor(solInWithSlippage * web3_js_1.LAMPORTS_PER_SOL);
        const ASSOCIATED_USER = tokenAccount;
        const USER = owner;
        const BONDING_CURVE = new web3_js_1.PublicKey(bonding_curve);
        const ASSOCIATED_BONDING_CURVE = new web3_js_1.PublicKey(associated_bonding_curve);
        const keys = [
            { pubkey: constants_1.GLOBAL, isSigner: false, isWritable: false },
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_USER, isSigner: false, isWritable: true },
            { pubkey: USER, isSigner: false, isWritable: true },
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: constants_1.RENT, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
        ];
        const data = Buffer.concat([
            (0, utils_1.bufferFromUInt64)(constants_1.PUMP_FUN_PROGRAM_BUY_INSTRUCTION),
            (0, utils_1.bufferFromUInt64)(tokenOut),
            (0, utils_1.bufferFromUInt64)(maxSolCost)
        ]);
        const instruction = new web3_js_1.TransactionInstruction({
            keys: keys,
            programId: constants_1.PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);
        const transaction = await (0, utils_1.createTransaction)(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);
        const signature = await (0, utils_1.withRetry)(() => (0, utils_1.sendAndConfirmTransactionWrapper)(connection, transaction, [payer]));
        return signature;
    }
    catch (error) {
        logger_1.default.error('Error in pumpFunBuy:', error);
        throw error;
    }
}
async function pumpFunSell(payerPrivateKey, mintStr, tokenBalance, priorityFeeInSol = 0, slippageDecimal = 0.25) {
    try {
        const connection = solana_1.SolanaProvider.Instance.Connection;
        const bc = await account_1.AccountResolver.getBondingCurveAccount(new web3_js_1.PublicKey(mintStr));
        solana_1.SolanaProvider.Instance.Connection.confirmTransaction;
        const coinData = bc;
        const { bonding_curve, associated_bonding_curve } = await account_1.AccountResolver.getTokenBondingCurve(mintStr);
        if (!coinData) {
            throw new Error(`pumpFunSell: Failed to retrieve coin data for ${mintStr}`);
        }
        const payer = (0, utils_1.getKeyPairFromBase64SecretKey)(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new web3_js_1.PublicKey(mintStr);
        const txBuilder = new web3_js_1.Transaction();
        const tokenAccountAddress = await (0, utils_1.withRetry)(() => (0, spl_token_1.getAssociatedTokenAddress)(mint, owner, false));
        const tokenAccountInfo = await (0, utils_1.withRetry)(() => connection.getAccountInfo(tokenAccountAddress));
        let tokenAccount;
        if (!tokenAccountInfo) {
            txBuilder.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccountAddress, payer.publicKey, mint));
            tokenAccount = tokenAccountAddress;
        }
        else {
            tokenAccount = tokenAccountAddress;
        }
        const minSolOutput = Math.floor(tokenBalance * (1 - slippageDecimal) * Number(coinData.virtualSolReserves) / Number(coinData.virtualTokenReserves));
        const keys = [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: constants_1.GLOBAL, isSigner: false, isWritable: false },
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: new web3_js_1.PublicKey(bonding_curve), isSigner: false, isWritable: true },
            { pubkey: new web3_js_1.PublicKey(associated_bonding_curve), isSigner: false, isWritable: true },
            { pubkey: tokenAccount, isSigner: false, isWritable: true },
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: constants_1.ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
            { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
        ];
        const data = Buffer.concat([
            (0, utils_1.bufferFromUInt64)(constants_1.PUMP_FUN_PROGRAM_SELL_INSTRUCTION),
            (0, utils_1.bufferFromUInt64)(tokenBalance),
            (0, utils_1.bufferFromUInt64)(minSolOutput)
        ]);
        const instruction = new web3_js_1.TransactionInstruction({
            keys: keys,
            programId: constants_1.PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);
        const transaction = await (0, utils_1.createTransaction)(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);
        const signature = await (0, utils_1.withRetry)(() => (0, utils_1.sendAndConfirmTransactionWrapper)(connection, transaction, [payer]));
        return signature;
    }
    catch (error) {
        logger_1.default.error('Error in pumpFunSell:', error);
        throw error;
    }
}

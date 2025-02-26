"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePumpFunTx = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = __importDefault(require("@utils/logger"));
const parsePumpFunTx = (tx) => {
    if (tx.meta == null) {
        console.warn(`Transaction has no meta for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    if (tx.meta.innerInstructions == null) {
        console.warn(`Transaction has no inner instructions for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    let swapIndex = tx.meta.innerInstructions.findIndex((instruction) => {
        if (instruction.index <= 0) {
            return false;
        }
        for (const instr of instruction.instructions) {
            const search = instr.data.slice(0, 10);
            if (search === 'AJTQ2h9DXr' || search === '5jRcjdixRU') {
                return true;
            }
        }
        return false;
    });
    if (swapIndex === -1) {
        swapIndex = tx.transaction.message.compiledInstructions.findIndex((instruction) => {
            if (instruction.accountKeyIndexes.length <= 0) {
                return false;
            }
            const buff = Buffer.from(instruction.data);
            const searchCut = buff.toString('hex').slice(0, 16);
            if (searchCut === '66063d1201daebea' || searchCut === '33e685a4017f83ad') {
                return true;
            }
            return false;
        });
        if (swapIndex === -1) {
            logger_1.default.warn(`Swap instruction not found for signature ${tx.transaction.signatures[0].toString()}`);
            return null;
        }
    }
    if (tx.meta.postTokenBalances == null) {
        console.warn(`Transaction has no post token balances for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    const inputAccounts = tx
        .transaction
        .message
        .compiledInstructions[swapIndex]
        .accountKeyIndexes
        .map((index) => tx.transaction.message.getAccountKeys().get(index));
    if (inputAccounts.length < 12) {
        console.log(`Invalid input accounts length for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    const global = inputAccounts[0];
    const mint = inputAccounts[2];
    const bondingCurve = inputAccounts[3];
    const associatedBondingCurve = inputAccounts[4];
    const user = inputAccounts[6];
    const systemProgram = inputAccounts[7];
    const tokenProgram = inputAccounts[8];
    const rent = inputAccounts[9];
    const eventAuthority = inputAccounts[10];
    const program = inputAccounts[11];
    let bondingCurveIndex = -1;
    const accounts = tx.transaction.message.getAccountKeys();
    for (let i = 0; i < accounts.length; i++) {
        if (accounts.get(i)?.equals(bondingCurve)) {
            bondingCurveIndex = i;
            break;
        }
    }
    if (bondingCurveIndex === -1) {
        logger_1.default.warn(`Transaction has no bonding curve for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    const postTokenBalance = tx.meta.postTokenBalances.find((balance) => (new web3_js_1.PublicKey(balance.mint)).equals(mint))?.uiTokenAmount.amount;
    if (!postTokenBalance) {
        logger_1.default.warn(`Transaction has no post token balance for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }
    return {
        signature: tx.transaction.signatures[0].toString(),
        mint,
        bondingCurve,
        associatedBondingCurve,
        global,
        user,
        systemProgram,
        tokenProgram,
        rent,
        eventAuthority,
        program,
        userPreLamportAmount: BigInt(tx.meta.preBalances[0]),
        userPostLamportAmount: BigInt(tx.meta.postBalances[0]),
        preTokenAmount: BigInt(tx.meta.preTokenBalances.find((balance) => (new web3_js_1.PublicKey(balance.mint)).equals(mint)).uiTokenAmount.amount),
        postTokenAmount: BigInt(tx.meta.postTokenBalances.find((balance) => (new web3_js_1.PublicKey(balance.mint)).equals(mint)).uiTokenAmount.amount),
        timestamp: (tx.blockTime) * 1000
    };
};
exports.parsePumpFunTx = parsePumpFunTx;

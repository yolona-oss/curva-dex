"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTxDetails = exports.buildVersionedTx = void 0;
exports.sendTx = sendTx;
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("@core/providers/solana");
async function sendTx(connection, tx, payer, signers, priorityFees, commitment = solana_1.DEFAULT_COMMITMENT, finality = solana_1.DEFAULT_FINALITY) {
    let newTx = new web3_js_1.Transaction();
    if (priorityFees) {
        const modifyComputeUnits = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({
            units: priorityFees.unitLimit,
        });
        const addPriorityFee = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFees.unitPrice,
        });
        newTx.add(modifyComputeUnits);
        newTx.add(addPriorityFee);
    }
    newTx.add(tx);
    let versionedTx = await (0, exports.buildVersionedTx)(connection, payer, newTx, commitment);
    versionedTx.sign(signers);
    try {
        const sig = await connection.sendTransaction(versionedTx, {
            skipPreflight: false,
        });
        console.log("sig:", `https://solscan.io/tx/${sig}`);
        let txResult = await (0, exports.getTxDetails)(connection, sig, commitment, finality);
        if (!txResult) {
            return {
                success: false,
                error: "Transaction failed",
            };
        }
        return {
            success: true,
            signature: sig,
            results: txResult,
        };
    }
    catch (e) {
        if (e instanceof web3_js_1.SendTransactionError) {
            let ste = e;
            console.log("SendTransactionError" + await ste.getLogs(connection));
        }
        else {
            console.error(e);
        }
        return {
            error: e,
            success: false,
        };
    }
}
const buildVersionedTx = async (connection, payer, tx, commitment = solana_1.DEFAULT_COMMITMENT) => {
    const blockHash = (await connection.getLatestBlockhash(commitment))
        .blockhash;
    let messageV0 = new web3_js_1.TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockHash,
        instructions: tx.instructions,
    }).compileToV0Message();
    return new web3_js_1.VersionedTransaction(messageV0);
};
exports.buildVersionedTx = buildVersionedTx;
const getTxDetails = async (connection, sig, commitment = solana_1.DEFAULT_COMMITMENT, finality = solana_1.DEFAULT_FINALITY) => {
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: sig,
    }, commitment);
    return connection.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
        commitment: finality,
    });
};
exports.getTxDetails = getTxDetails;

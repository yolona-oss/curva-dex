import { LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SolanaProvider } from '@core/providers/solana';
import {
    getKeyPairFromPrivateKey,
    createTransaction,
    sendAndConfirmTransactionWrapper,
    bufferFromUInt64,
    withRetry,
    getKeyPairFromBase64SecretKey
} from './utils';
import {
    GLOBAL,
    FEE_RECIPIENT,
    SYSTEM_PROGRAM_ID,
    RENT,
    PUMP_FUN_ACCOUNT,
    PUMP_FUN_PROGRAM,
    ASSOC_TOKEN_ACC_PROG,
    PUMP_FUN_PROGRAM_SELL_INSTRUCTION,
    PUMP_FUN_PROGRAM_BUY_INSTRUCTION
} from './constants';

import logger from '@logger';
import { AccountResolver } from './account';

//import { Tx } from '@core/utils/blockchain/tx';

export const DEFAULT_SLIPPAGE_DECIMAL = 0.25;
export const DEFAULT_PRIORITY_FEE_SOL = 0;

export type PumpFunSwapFn = (
    payerPrivateKey: string,
    mintStr: string,
    toSpend: bigint,
    priorityFeeInSol?: number,
    slippageDecimal?: number
) => Promise<string>

export const pumpFunBuy: PumpFunSwapFn = async (
    payerPrivateKey: string,
    mintStr: string,
    lamportsIn: bigint,
    priorityFeeInSol: number = DEFAULT_PRIORITY_FEE_SOL,
    slippageDecimal: number = DEFAULT_SLIPPAGE_DECIMAL
) => {
    try {
        const connection = SolanaProvider.Instance.Connection

        const bc = await AccountResolver.getBondingCurveAccount(new PublicKey(mintStr));
        SolanaProvider.Instance.Connection.confirmTransaction
        const coinData = bc
        
        const { bonding_curve, associated_bonding_curve } = await AccountResolver.getTokenBondingCurve(mintStr)
        if (!coinData) {
            throw new Error(`pumpFunBuy: Failed to retrieve coin data for ${mintStr}`);
        }

        const payer = await getKeyPairFromPrivateKey(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new PublicKey(mintStr);

        const txBuilder = new Transaction();

        const tokenAccountAddress = await withRetry(() => 
            getAssociatedTokenAddress(
                mint,
                owner,
                false
            )
        );

        const tokenAccountInfo = await withRetry(() => 
            connection.getAccountInfo(<PublicKey>tokenAccountAddress)
        );

        let tokenAccount: PublicKey;
        if (!tokenAccountInfo) {
            txBuilder.add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    tokenAccountAddress,
                    payer.publicKey,
                    mint
                )
            );
            tokenAccount = <PublicKey>tokenAccountAddress;
        } else {
            tokenAccount = <PublicKey>tokenAccountAddress;
        }

        const tokenOut = Math.floor(Number(lamportsIn) * Number(coinData.virtualTokenReserves) / Number(coinData.virtualSolReserves));

        const inWithSlippage = Number(lamportsIn) * (1 + slippageDecimal);
        const maxCost = Math.floor(inWithSlippage * LAMPORTS_PER_SOL);
        const ASSOCIATED_USER = tokenAccount;
        const USER = owner;
        const BONDING_CURVE = new PublicKey(bonding_curve);
        const ASSOCIATED_BONDING_CURVE = new PublicKey(associated_bonding_curve);

        const keys = [
            { pubkey: GLOBAL, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_BONDING_CURVE, isSigner: false, isWritable: true },
            { pubkey: ASSOCIATED_USER, isSigner: false, isWritable: true },
            { pubkey: USER, isSigner: false, isWritable: true },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: RENT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
        ];

        const data = Buffer.concat([
            bufferFromUInt64(PUMP_FUN_PROGRAM_BUY_INSTRUCTION),
            bufferFromUInt64(tokenOut),
            bufferFromUInt64(maxCost)
        ]);

        const instruction = new TransactionInstruction({
            keys: keys,
            programId: PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);

        const transaction = await createTransaction(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);
        
        const signature = await withRetry(() => 
            sendAndConfirmTransactionWrapper(connection, transaction, [payer])
        );
        return signature
    } catch (error) {
        log.error('Error in pumpFunBuy:', error);
        throw error;
    }
}

export const pumpFunSell: PumpFunSwapFn = async (
    payerPrivateKey: string,
    mintStr: string,
    outToken: bigint,
    priorityFeeInSol: number = DEFAULT_PRIORITY_FEE_SOL,
    slippageDecimal: number = DEFAULT_SLIPPAGE_DECIMAL
) => {
    try {
        const connection = SolanaProvider.Instance.Connection

        const bc = await AccountResolver.getBondingCurveAccount(new PublicKey(mintStr));
        SolanaProvider.Instance.Connection.confirmTransaction
        const coinData = bc
        
        const { bonding_curve, associated_bonding_curve } = await AccountResolver.getTokenBondingCurve(mintStr)
        if (!coinData) {
            throw new Error(`pumpFunSell: Failed to retrieve coin data for ${mintStr}`);
        }

        const payer = getKeyPairFromBase64SecretKey(payerPrivateKey);
        const owner = payer.publicKey;
        const mint = new PublicKey(mintStr);
        const txBuilder = new Transaction();

        const tokenAccountAddress = await withRetry(() => 
            getAssociatedTokenAddress(
                mint,
                owner,
                false
            )
        );

        const tokenAccountInfo = await withRetry(() => 
            connection.getAccountInfo(<PublicKey>tokenAccountAddress)
        );

        let tokenAccount: PublicKey;
        if (!tokenAccountInfo) {
            txBuilder.add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    tokenAccountAddress,
                    payer.publicKey,
                    mint
                )
            );
            tokenAccount = <PublicKey>tokenAccountAddress;
        } else {
            tokenAccount = <PublicKey>tokenAccountAddress;
        }

        const minSolOutput = Math.floor(Number(outToken)! * (1 - slippageDecimal) * Number(coinData.virtualSolReserves) / Number(coinData.virtualTokenReserves));

        const keys = [
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: GLOBAL, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: new PublicKey(bonding_curve), isSigner: false, isWritable: true },
            { pubkey: new PublicKey(associated_bonding_curve), isSigner: false, isWritable: true },
            { pubkey: tokenAccount, isSigner: false, isWritable: true },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
        ];

        const data = Buffer.concat([
            bufferFromUInt64(PUMP_FUN_PROGRAM_SELL_INSTRUCTION),
            bufferFromUInt64(Number(outToken)),
            bufferFromUInt64(minSolOutput)
        ]);

        const instruction = new TransactionInstruction({
            keys: keys,
            programId: PUMP_FUN_PROGRAM,
            data: data
        });
        txBuilder.add(instruction);

        const transaction = await createTransaction(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);

        const signature = await withRetry(() => 
            sendAndConfirmTransactionWrapper(connection, transaction, [payer])
        );
        return signature
    } catch (error) {
        log.error('Error in pumpFunSell:', error);
        throw error;
    }
}

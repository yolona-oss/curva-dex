import { PublicKey, VersionedTransactionResponse } from "@solana/web3.js";

import log from '@logger';

// swap instcution but with added token&blanace info
export interface SwapInstructionWithBalance {
    signature: string;
    mint: PublicKey;
    bondingCurve: PublicKey;
    associatedBondingCurve: PublicKey;
    global: PublicKey;
    user: PublicKey;
    systemProgram: PublicKey;
    tokenProgram: PublicKey;
    rent: PublicKey;
    eventAuthority: PublicKey;
    program: PublicKey;

    userPreLamportAmount: bigint;
    userPostLamportAmount: bigint;
    preTokenAmount: bigint;
    postTokenAmount: bigint;

    timestamp: number
}

export const parsePumpFunTx = (tx: VersionedTransactionResponse): SwapInstructionWithBalance | null => {
    // check if transaction has meta or loaded addresses
    if (tx.meta == null) {
        console.warn(`Transaction has no meta for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    if (tx.meta.innerInstructions == null) {
        console.warn(`Transaction has no inner instructions for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    // find the create instruction index
    let swapIndex = tx.meta.innerInstructions.findIndex((instruction) => {
        // check if program id index is valid
        if (instruction.index <= 0) {
            return false;
        }


        // 5jRcjdixRUDNz5WFwxS8iVQe7mAZygAJB
        // 5jRcjdixRUDdrqXTyD4u8z9yKU23krG3R like 5jRcjdixRUD to sell
        // AJTQ2h9DXrC3k31Cf9h8gWSbYTSmzadsd like AJTQ2h9DXr to buy
        for (const instr of instruction.instructions) {
            const search = instr.data.slice(0, 10)
            if (search === 'AJTQ2h9DXr' || search === '5jRcjdixRU') {
                return true
            }
        }

        return false;
    });

    // return null if swap index is not found
    if (swapIndex === -1) {
        //console.log(`Swap instruction not found for signature ${tx.transaction.signatures[0].toString()}`);
        swapIndex = tx.transaction.message.compiledInstructions.findIndex((instruction) => {
            if (instruction.accountKeyIndexes.length <= 0) {
                return false
            }

            // buy(66063d1201daebea) sell(33e685a4017f83ad)
            const buff = Buffer.from(instruction.data)
            const searchCut = buff.toString('hex').slice(0, 16)
            if (searchCut === '66063d1201daebea' || searchCut === '33e685a4017f83ad') {
                return true
            }

            return false
        })
        if (swapIndex === -1) {
            log.warn(`Swap instruction not found for signature ${tx.transaction.signatures[0].toString()}`)
            return null
        }
    }

    // check if transaction has post token balances
    if (tx.meta.postTokenBalances == null) {
        console.warn(`Transaction has no post token balances for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    // get instruction input accounts
    const inputAccounts = tx
    .transaction
    .message
    .compiledInstructions[swapIndex]
    .accountKeyIndexes
    .map((index) => tx.transaction.message.getAccountKeys().get(index)!);

    // check if input accounts length is 14
    if (inputAccounts.length < 12) {
        console.log(`Invalid input accounts length for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    /*
    * 0 global
    * 1 fee recipient
    * 2 mint
    * 3 bonding curve
    * 4 associated bonding curve
    * 5 associated user
    * 6 user
    * 7 system program
    * 8 token program
    * 9 rent
    * 10 event authority
    * 11 program
    *
    * 12+ (argegator input accounts)
    */

    // parse input accounts
    const global = inputAccounts[0];
    const mint = inputAccounts[2];
    const bondingCurve = inputAccounts[3];
    const associatedBondingCurve = inputAccounts[4];
    //const associatedUser = inputAccounts[5];
    const user = inputAccounts[6];
    const systemProgram = inputAccounts[7];
    const tokenProgram = inputAccounts[8];
    const rent = inputAccounts[9];
    const eventAuthority = inputAccounts[10];
    const program = inputAccounts[11];

    let bondingCurveIndex = -1;

    // find the account index of the bonding curve
    const accounts = tx.transaction.message.getAccountKeys();
    for (let i = 0; i < accounts.length; i++) {
        if (accounts.get(i)?.equals(bondingCurve)) {
            bondingCurveIndex = i;
            break;
        }
    }
    if (bondingCurveIndex === -1) {
        log.warn(`Transaction has no bonding curve for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    // try to fetch post token balance
    const postTokenBalance = tx.meta.postTokenBalances.find((balance) => (
        new PublicKey(balance.mint)).equals(mint)
    )?.uiTokenAmount.amount
    if (!postTokenBalance) {
        log.warn(`Transaction has no post token balance for signature ${tx.transaction.signatures[0].toString()}`);
        return null;
    }

    // return create instruction
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
        preTokenAmount: BigInt(tx.meta.preTokenBalances!.find((balance) => (new PublicKey(balance.mint)).equals(mint))!.uiTokenAmount.amount),
        postTokenAmount: BigInt(tx.meta.postTokenBalances!.find((balance) => (new PublicKey(balance.mint)).equals(mint))!.uiTokenAmount.amount),

        timestamp: (tx.blockTime!) * 1000
    };
};

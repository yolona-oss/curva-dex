import { BaseWalletManager } from './base-wallet';

import { IBalance, IBalanceList } from './../types/balance';
import { IDEXWallet } from './../types/wallet';

import { Connection, Keypair, SystemProgram, Transaction, PublicKey, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';

import log from '@utils/logger'
import { sleep } from '@utils/time';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { SolanaProvider } from '@core/providers/solana';

export class SolanaWalletManager extends BaseWalletManager {
    private readonly connection: Connection;

    public readonly nativeCurrency = "LAMPORTS"

    constructor() {
        super()
        this.connection = SolanaProvider.Instance.Connection
    }

    public decodeWallet(base64SecretKey: string): Keypair {
        return Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(base64SecretKey, 'base64'))
        );
    }

    public createWalletFromPrivateKey(privateKeyBase58: string): Keypair {
        const privateKeyBytes = Uint8Array.from(bs58.decode(privateKeyBase58));
        return Keypair.fromSecretKey(privateKeyBytes);
    }

    async balance(wallet: Omit<IDEXWallet, "secretKey">): Promise<IBalanceList> {
        const ret = []

        this.connection
        const lamports = BigInt(
            await this.connection.getBalance(new PublicKey(wallet.publicKey))
        )

        ret.push({
            mint: this.nativeCurrency,
            amount: lamports
        })

        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(new PublicKey(wallet.publicKey), {
            programId: new PublicKey(TOKEN_PROGRAM_ID),
        });

        for (const account of tokenAccounts.value) {
            if (account.account.data.parsed.info.isNative) {
                continue
            }
            const balance = account.account.data.parsed.info.tokenAmount.amount

            if (balance) {
                ret.push({
                    mint: account.account.data.parsed.info.mint,
                    amount: balance
                })
            }
        }

        return ret
    }

    async createWallet(): Promise<IDEXWallet> {
        const w = Keypair.generate()
        return {
            publicKey: w.publicKey.toString(),
            secretKey: Buffer.from(w.secretKey).toString('base64')
        }
    }

    private async collectFromOne(src: Omit<IDEXWallet, "publicKey">, dst: Omit<IDEXWallet, "secretKey">, rest?: bigint): Promise<{ success: boolean, transferAmount?: bigint, message?: string }> {
        try {
            const wallet = this.decodeWallet(src.secretKey);
            const balance = BigInt(await this.connection.getBalance(wallet.publicKey));
            const transferAmount = balance - (rest ?? 0n);

            if (transferAmount <= 0) {
                return {
                    success: false,
                    message: 'Insufficient balance for transfer'
                }
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(dst.publicKey),
                    lamports: transferAmount,
                })
            );

            const signature = await this.connection.sendTransaction(transaction, [wallet]);
            await this.connection.confirmTransaction(signature);
            return {
                success: true,
                transferAmount
            }
        } catch (e: any) {
            return {
                success: false,
                message: e?.message
            }
        }
    }

    async collect(src: IDEXWallet[], dst: Omit<IDEXWallet, "secretKey">): Promise<(IBalance&Omit<IDEXWallet, "secretKey">)[]> {
        const ret = []
        for (const wallet of src) {
            const { success, transferAmount, message } = await this.collectFromOne(wallet, dst)
            if (success) {
                ret.push({
                    publicKey: wallet.publicKey,
                    mint: this.nativeCurrency,
                    amount: transferAmount!
                })
            } else if (message) {
                log.error(`Error collecting from ${wallet.publicKey}: ${message}`)
            }
        }
        return ret
    }

    async collectToken(src: IDEXWallet[], dst: Omit<IDEXWallet, 'secretKey'>, mint: string): Promise<(IBalance<bigint> & Omit<IDEXWallet, 'secretKey'>)[]> {
        src;dst;mint
        return []
        //const ret = []
        //for (const wallet of src) {
        //    const { success, transferAmount, message } = await this.collectFromOne(wallet, dst)
        //    if (success) {
        //        ret.push({
        //            publicKey: wallet.publicKey,
        //            mint,
        //            amount: transferAmount!
        //        })
        //    } else if (message) {
        //        log.error(`Error collecting from ${wallet.publicKey}: ${message}`)
        //    }
        //}
        //return ret
    }

    async send(src: Omit<IDEXWallet, "publicKey">, dst: Omit<IDEXWallet, "secretKey">, amount: bigint) {
        const retries = 3
        const srcWallet = this.decodeWallet(src.secretKey)
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: new PublicKey(srcWallet.publicKey),
                        toPubkey: new PublicKey(dst.publicKey),
                        lamports: amount,
                    })
                );

                const signature = await this.connection.sendTransaction(
                    transaction, 
                    [srcWallet]
                );
                await this.connection.confirmTransaction(signature);
                log.info(`sign: ${signature} <|> Distributed ${amount} lamports to ${dst.publicKey}`)
                return
            } catch (err: any) {
                if (attempt === retries - 1) throw err;
                if (err.message.includes('429')) {
                    await sleep(1000 * (attempt + 1));
                    continue;
                }
                throw err;
            }
        }
        throw new Error('Max retries reached');
    }

    async distribute(src: Omit<IDEXWallet, "publicKey">, dst: { wallet: Omit<IDEXWallet, "secretKey">, amount: bigint }[]): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]> {

        let ret = []
        for (const destination of dst) {
            try {
                await this.send(src, destination.wallet, destination.amount)
                ret.push({
                    publicKey: destination.wallet.publicKey,
                    mint: this.nativeCurrency,
                    amount: destination.amount
                })
            } catch (e) {
                log.error(`Error distributing to ${destination.wallet.publicKey}: ${e}`)
                ret.push({
                    publicKey: destination.wallet.publicKey,
                    mint: "LAMPORTS",
                    amount: 0n
                })
            }
        }
        return ret
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaConnection = void 0;
const web3_js_1 = require("@solana/web3.js");
const ClusterValues = ["mainnet-beta", "testnet", "devnet"];
class SolanaConnection {
    cluster;
    senderPrivKey;
    connection;
    isConnected = false;
    constructor(cluster = 'mainnet-beta', senderPrivKey = web3_js_1.Keypair.generate()) {
        this.cluster = cluster;
        this.senderPrivKey = senderPrivKey;
    }
    IsConnected() {
        return this.isConnected;
    }
    async connect() {
        if (this.isConnected) {
            throw new Error("BlockchainClient.connect() Already connected");
        }
        const endpoint = ClusterValues.includes(this.cluster) ? (0, web3_js_1.clusterApiUrl)(this.cluster) : this.cluster;
        this.connection = new web3_js_1.Connection(endpoint, 'confirmed');
        this.isConnected = true;
    }
    async disconnect() {
        if (!this.isConnected) {
            throw new Error("BlockchainClient.disconnect() Not connected");
        }
        this.isConnected = false;
        this.connection = undefined;
    }
    getConnection() {
        return this.connection;
    }
    async createVersionedTransaction(instructions, recentBlockhash = undefined) {
        if (!recentBlockhash) {
            recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
        }
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: this.senderPrivKey.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: instructions,
        }).compileToV0Message();
        const transaction = new web3_js_1.VersionedTransaction(messageV0);
        return transaction;
    }
    async sendVersionedTransaction(transaction) {
        transaction.sign([this.senderPrivKey]);
        const rawTransaction = transaction.serialize();
        const signature = await this.connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
        });
        return signature;
    }
    async confirmTransaction(signature) {
        const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
        return confirmation;
    }
    async getGasPrice() {
        return await this.connection.getRecentBlockhash()
            .then(({ feeCalculator }) => BigInt(feeCalculator.lamportsPerSignature));
    }
    async getCurrentBlockOrSlot() {
        return this.connection.getSlot();
    }
    async getBalance(address) {
        const publicKey = new web3_js_1.PublicKey(address);
        const balance = await this.connection.getBalance(publicKey);
        return BigInt(balance / web3_js_1.LAMPORTS_PER_SOL);
    }
    async sendTransaction(from, to, value, _, __) {
        const fromPubkey = new web3_js_1.PublicKey(from);
        const toPubkey = new web3_js_1.PublicKey(to);
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: parseFloat(value) * web3_js_1.LAMPORTS_PER_SOL
        }));
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.senderPrivKey]);
    }
    async interactWithContract(contractAddress, abi, methodName, ...args) {
        const instruction = new web3_js_1.TransactionInstruction({
            keys: [
                { pubkey: new web3_js_1.PublicKey(contractAddress), isSigner: false, isWritable: true },
                { pubkey: this.senderPrivKey.publicKey, isSigner: false, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: new web3_js_1.PublicKey(contractAddress),
            data: Buffer.from(abi.interface.encodeFunctionData(methodName, args)),
        });
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: this.senderPrivKey.publicKey,
            recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
            instructions: [instruction],
        }).compileToV0Message();
        const transaction = new web3_js_1.VersionedTransaction(messageV0);
        try {
            const rawTransaction = transaction.serialize();
            const signature = await this.connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
            });
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
                throw new Error("SolanaConnection.interactWithContract() Configramtion error: " + confirmation.value.err.toString());
            }
        }
        catch (error) {
            throw new Error("SolanaConnection.interactWithContract() Error: " + error);
        }
    }
    async sendTransactionToContract(contractAddress, abi, methodName, from, ...args) {
        const instruction = new web3_js_1.TransactionInstruction({
            keys: [
                { pubkey: new web3_js_1.PublicKey(contractAddress), isSigner: false, isWritable: true },
                { pubkey: new web3_js_1.PublicKey(from), isSigner: true, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: new web3_js_1.PublicKey(contractAddress),
            data: Buffer.from(abi.interface.encodeFunctionData(methodName, args)),
        });
        const transaction = await this.createVersionedTransaction([instruction]);
        const signature = await this.sendVersionedTransaction(transaction);
        const confirmation = await this.confirmTransaction(signature);
        if (confirmation.value.err) {
            throw new Error("SolanaConnection.sendTransactionToContract() Error: " + confirmation.value.err.toString());
        }
    }
    async getBlockNumber() {
        return BigInt(await this.connection.getBlockHeight());
    }
}
exports.SolanaConnection = SolanaConnection;

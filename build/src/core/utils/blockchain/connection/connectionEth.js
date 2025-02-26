"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthBlockchainConnection = void 0;
const web3_1 = require("web3");
const networks_1 = __importStar(require("@utils/blockchain/internal/networks"));
class EthBlockchainConnection {
    connNetwork;
    isConnected = false;
    web3 = new web3_1.Web3(new web3_1.Web3.providers.HttpProvider(networks_1.web3_dummy_network.rpc.toString()));
    constructor(connNetwork) {
        this.connNetwork = connNetwork;
    }
    async connect() {
        if (this.isConnected) {
            throw new Error("BlockchainClient.connect() Already connected");
        }
        this.web3 = new web3_1.Web3(new web3_1.Web3.providers.HttpProvider(networks_1.default["eth"].rpc.toString()));
        this.connNetwork = networks_1.default["eth"];
        this.isConnected = true;
    }
    async disconnect() {
        if (!this.isConnected) {
            throw new Error("BlockchainClient.disconnect() Not connected");
        }
        this.isConnected = false;
        this.connNetwork = networks_1.web3_dummy_network;
        return this.web3.provider?.disconnect();
    }
    IsConnected() {
        return this.isConnected;
    }
    getConnection() {
        return this.web3;
    }
    CurrentNetwork() {
        return this.connNetwork;
    }
    async sendTransaction(from, to, value, gas, data) {
        const tx = {
            from,
            to,
            value: this.web3.utils.toWei(value, 'ether'),
            gas,
            data
        };
        return await this.web3.eth.sendTransaction(tx);
    }
    async interactWithContract(contractAddress, abi, methodName, ...args) {
        const contract = new this.web3.eth.Contract(abi, contractAddress);
        const method = contract.methods[methodName](...args);
        return await method.call();
    }
    async sendTransactionToContract(contractAddress, abi, methodName, from, gas, ...args) {
        const contract = new this.web3.eth.Contract(abi, contractAddress);
        const method = contract.methods[methodName](...args);
        const encodedABI = method.encodeABI();
        const tx = {
            from,
            to: contractAddress,
            gas,
            data: encodedABI
        };
        return await this.web3.eth.sendTransaction(tx);
    }
    async getBlockNumber() {
        return await this.web3.eth.getBlockNumber();
    }
    async getBalance(address) {
        return await this.web3.eth.getBalance(address);
    }
    async getGasPrice() {
        return await this.web3.eth.getGasPrice();
    }
}
exports.EthBlockchainConnection = EthBlockchainConnection;

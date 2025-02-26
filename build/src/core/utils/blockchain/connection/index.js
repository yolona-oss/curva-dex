"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaConnection = exports.EthBlockchainConnection = void 0;
var connectionEth_1 = require("./connectionEth");
Object.defineProperty(exports, "EthBlockchainConnection", { enumerable: true, get: function () { return connectionEth_1.EthBlockchainConnection; } });
var connectionSol_1 = require("./connectionSol");
Object.defineProperty(exports, "SolanaConnection", { enumerable: true, get: function () { return connectionSol_1.SolanaConnection; } });

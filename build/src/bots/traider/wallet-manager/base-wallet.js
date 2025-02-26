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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWalletManager = void 0;
const config_1 = require("@core/config");
const logger_1 = __importDefault(require("@utils/logger"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
class BaseWalletManager {
    saveUsedWallet(wallet) {
        const cfg = (0, config_1.getInitialConfig)();
        const pathToSaveFile = path_1.default.join(cfg.server.fileStorage.path, "used-wallets.json");
        const data = fs.readFileSync(pathToSaveFile, 'utf8');
        try {
            const obj = JSON.parse(data);
            if (!obj?.wallets) {
                obj.wallets = [];
            }
            obj.wallets.push(wallet);
            fs.writeFileSync(pathToSaveFile, JSON.stringify(obj, null, 4));
        }
        catch (e) {
            logger_1.default.error(`Error saving used wallets: ${e}`);
        }
    }
    nativeCurrencyBalance(balances) {
        return balances.find(b => b.mint === this.nativeCurrency);
    }
    static cmpWallets(a, b) {
        return (a.publicKey === b.publicKey) && (a.secretKey === b.secretKey);
    }
}
exports.BaseWalletManager = BaseWalletManager;

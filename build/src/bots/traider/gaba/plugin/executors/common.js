"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNativeBalance = getNativeBalance;
exports.getTokenBalance = getTokenBalance;
const CmdError_1 = require("@paragon/Types/CmdError");
const logger_1 = __importDefault(require("@utils/logger"));
async function getNativeBalance(...inputs) {
    const slaveId = inputs[0];
    try {
        const balance = await this.master.getSalveBalanceNative(slaveId);
        return new CmdError_1.CmdError(true, balance.amount);
    }
    catch (e) {
        logger_1.default.error(e);
        return new CmdError_1.CmdError(false, undefined, e);
    }
}
async function getTokenBalance(...inputs) {
    const slaveId = inputs[0];
    const mint = inputs[1];
    try {
        const balance = await this.master.getSlaveBalanceForAsset(slaveId, mint);
        if (!balance) {
            return new CmdError_1.CmdError(true, 0n);
        }
        return new CmdError_1.CmdError(true, balance.amount);
    }
    catch (e) {
        logger_1.default.error(e);
        return new CmdError_1.CmdError(false, undefined, e);
    }
}

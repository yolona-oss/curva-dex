"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWithSlippageSell = calculateWithSlippageSell;
exports.calculateWithSlippageBuy = calculateWithSlippageBuy;
function calculateWithSlippageSell(amount, basisPoints) {
    return amount - (amount * basisPoints) / 10000n;
}
;
function calculateWithSlippageBuy(amount, basisPoints) {
    return amount + (amount * basisPoints) / 10000n;
}
;

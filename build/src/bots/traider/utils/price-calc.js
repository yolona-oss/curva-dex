"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceCalc = exports.priceCalcV2 = exports.priceCalcV1 = void 0;
const bigint_1 = require("@utils/math/bigint");
const priceCalcV1 = (preBlanace, postBalance, preAssetBalance, postAssetBalance) => {
    const dBalance = postBalance - preBlanace;
    const dAssets = postAssetBalance - preAssetBalance;
    return bigint_1.BigIntMath.abs(dAssets / dBalance);
};
exports.priceCalcV1 = priceCalcV1;
const priceCalcV2 = (balanceBefore, balanceAfter, valueBefore, valueAfter) => {
    const priceBefore = valueBefore / balanceBefore;
    const priceAfter = valueAfter / balanceAfter;
    const averagePrice = (priceBefore + priceAfter) / 2n;
    return averagePrice;
};
exports.priceCalcV2 = priceCalcV2;
exports.priceCalc = exports.priceCalcV1;

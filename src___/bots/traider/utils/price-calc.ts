import { BigIntMath } from "@utils/math/bigint";

export interface IPriceCalc {
    (
        preBlanace: bigint,
        postBalance: bigint,
        preAssetBalance: bigint,
        postAssetBalance: bigint
    ): bigint
}

export const priceCalcV1: IPriceCalc = (
    preBlanace: bigint,
    postBalance: bigint,
    preAssetBalance: bigint,
    postAssetBalance: bigint 
) => {
    const dBalance = postBalance - preBlanace
    const dAssets = postAssetBalance - preAssetBalance
    return BigIntMath.abs(dAssets / dBalance)
}

export const priceCalcV2: IPriceCalc = (
    balanceBefore: bigint,
    balanceAfter: bigint,
    valueBefore: bigint,
    valueAfter: bigint
) => {
    const priceBefore = valueBefore / balanceBefore;
    const priceAfter = valueAfter / balanceAfter;

    const averagePrice = (priceBefore + priceAfter) / 2n;
    return averagePrice;
}

export const priceCalc: IPriceCalc = priceCalcV1

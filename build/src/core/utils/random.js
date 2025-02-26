"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genRandomNumber = exports.genRandomString = exports.isNumberPositive = void 0;
exports.genRandomNumberBetween = genRandomNumberBetween;
exports.genRandomNumberBetweenWithScatter = genRandomNumberBetweenWithScatter;
exports.randomizeWithScatter = randomizeWithScatter;
exports.randomizeWithPercentScatter = randomizeWithPercentScatter;
const crypto_1 = __importDefault(require("crypto"));
const isNumberPositive = (v) => v > 0;
exports.isNumberPositive = isNumberPositive;
const genRandomString = (length = 15) => Math.random().toString(36).substring(2, length);
exports.genRandomString = genRandomString;
const genRandomNumber = (length = 15) => Number((0, exports.genRandomString)(length));
exports.genRandomNumber = genRandomNumber;
function genRandomNumberBetween(min, max) {
    if (typeof min === "bigint" && typeof max === "bigint") {
        const range = max - min + BigInt(1);
        const randomBigInt = crypto_1.default.getRandomValues(new BigUint64Array(1))[0] % range;
        return min + randomBigInt;
    }
    else if (typeof min === "number" && typeof max === "number") {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    else {
        throw new Error("Invalid types for min and max. They must both be either number or bigint.");
    }
}
function genRandomNumberBetweenWithScatter(min, max, scatter, fixed = 2) {
    if (typeof min !== typeof max || typeof min !== typeof scatter) {
        throw new Error("min, max, and scatter must be of the same type (Number or BigInt)");
    }
    if (typeof min === 'number') {
        const scatterMin = min - scatter;
        const scatterMax = max + scatter;
        const adjustedMin = Math.max(scatterMin, Number.MIN_SAFE_INTEGER);
        const adjustedMax = Math.min(scatterMax, Number.MAX_SAFE_INTEGER);
        return Number((Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin).toFixed(fixed));
    }
    else if (typeof min === 'bigint') {
        const scatterMin = min - scatter;
        const scatterMax = max + scatter;
        const adjustedMin = scatterMin < 0n ? 0n : scatterMin;
        const adjustedMax = scatterMax > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : scatterMax;
        const range = adjustedMax - adjustedMin + 1n;
        const randomBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return adjustedMin + (randomBits % range);
    }
    else {
        throw new Error("Unsupported type for min, max, or scatter");
    }
}
function randomizeWithScatter(value, scatter, fixed = 2) {
    return genRandomNumberBetweenWithScatter(value, value, scatter, fixed);
}
function randomizeWithPercentScatter(value, percent, fixed = 2) {
    let scatter;
    if (typeof value === "bigint") {
        scatter = value * (BigInt(percent) / BigInt(100));
    }
    else if (typeof value === "number") {
        scatter = value * (percent / 100);
    }
    else {
        throw new Error("Unsupported type for value");
    }
    return genRandomNumberBetweenWithScatter(value, value, scatter, fixed);
}

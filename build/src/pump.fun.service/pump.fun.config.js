"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCfg = void 0;
const built_in_1 = require("@bots/traider/impl/built-in");
exports.defaultCfg = {
    targetAsset: {
        bondCurvMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwy6H5v2",
        symbol: "USDC",
        mint: built_in_1.BLANK_MINT_PREFIX
    },
    motherShip: {
        secretKey: "0x0000000000000000",
        publicKey: "0xffffffffffffffff",
        minBalanceSol: 1
    },
    fee: {
        priority: {
            feeSol: 0.005,
            riseOnMEV: false,
            riseOnMEVPercent: 0,
        }
    },
    slippage: {
        percent: 0.25
    },
    initialBuy: {
        solAmount: 0.5
    },
    globalBalance: {
        restAmountSol: 0
    },
    traiders: {
        count: 0,
        resetAmountSol: 0,
        volatile: {
            count: 0,
            lifeTimeSeconds: 0,
            rechargeTimeSeconds: 0
        },
        intensity: {
            priceDeltaPercent: 0,
            volumeDeltaPercent: 0
        }
    },
    holders: {
        count: 0,
        resetAmountSol: 0,
        holdAssets: {
            percentFromInfusion: 0,
        }
    },
    priceSupport: {
        fallPercent: 0,
        buyBefore: {
            prevMaxPrice: false,
            flat: {
                periodSeconds: 0,
                changePercent: 0
            }
        },
        maxLamportsToSupport: 0,
        onFailDoAction: "idle"
    },
    terminate: {
        stopLoss: {
            fromInitialPercent: 0,
            fromCurrentPercent: 0,
            otherBotNetSellForSol: 0
        },
        bondCurvProgress: 0,
        tokenVolumeUSD: 0,
        marketCapUSD: 0,
        doAction: "idle"
    },
};

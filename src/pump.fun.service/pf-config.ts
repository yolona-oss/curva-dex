import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { IBaseDEXTradeAsset } from "@bots/traider"
import { BLANK_MINT_PREFIX } from "@bots/traider/impl/built-in"

export type OnStopAction = "sell-all" | "sell-traiders" | "idle"
export type OnPriceSupportFailAction = "sell-all" | "idle"

// check for initialize2 to radium migration
// https://solscan.io/account/39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg
export interface IBCPS_Config {
    targetAsset: IBaseDEXTradeAsset&{bondCurvMint: string}

    // wallet to distribute to other
    motherShip: {
        secretKey: string,
        publicKey: string,
        minBalanceSol: number // iron-rations
    }

    fee: {
        priority: {
            feeSol: number,
            riseOnMEV: boolean
            riseOnMEVPercent: number
        }
    },

    slippage: {
        percent: number
    }

    initialBuy: {
        solAmount: number // amount of SOL to buy for traiders an holders
    }

    globalBalance: {
        restAmountSol: number
    }

    traiders: {
        count: number // traiders count without volatile bots
        // bots that will be created and trades as normal then send all assets to holders then burns
        resetAmountSol: number
        intensity: {
            priceDeltaPercent: number,
            volumeDeltaPercent: number
        }
    }

    holders: {
        count: number
        resetAmountSol: number
        holdAssets: {
            percentFromInfusion: number, // percent of initialBuy.solAmount balance to buy for holders
        }
    }

    volatile: {
        count: number
        initialBalanceSol: number
        balanceScatter: number
        period: number // sec
        periodScatter: number
        isPeriodIncremental: boolean
        rechargeTime: number // sec
    }

    // try to buy on price fall for stabilize price
    // before maxLamportsToSupport not spent
    // then calls onFail action
    priceSupport: {
        fallPercent: number,
        // TODO
        buyBefore: {
            prevMaxPrice: boolean // price reached previous max price

            // check for price goes flat (before sets to => avg price*volume on period TODO!!!)
            flat: {
                periodSeconds: number // zero for period from fallPercent reached
                changePercent: number // max price change percent for flat
            }
        }
        maxLamportsToSupport: number,
        onFailDoAction: OnPriceSupportFailAction
    }

    // trigers to terminate
    terminate: {
        // on price fall do not overrides priceSupport
        stopLoss: {
            fromInitialPercent: number // price fall from initial price in moment of buying by a holder
            fromCurrentPercent: number // price fall from price in previus block or 1m|3m|5m TODO!!!!!!

            otherBotNetSellForSol: number // if others bot net or real users sell more than this amount of SOL in one minute or in current block
        },

        bondCurvProgress: number, // v
        tokenVolumeUSD: number,    // on asset reached some global target
        marketCapUSD: number,      // ^

        doAction: OnStopAction // perform some operation on robot going to stop
    },
}

export const defaultCfg: IBCPS_Config = {
    targetAsset: {
        bondCurvMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwy6H5v2",
        symbol: "USDC",
        mint: BLANK_MINT_PREFIX
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

    volatile: {
        count: 0,
        initialBalanceSol: 0.001,
        balanceScatter: 0.0001,
        period: 0,
        periodScatter: 0,
        isPeriodIncremental: false,
        rechargeTime: 0,
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
}

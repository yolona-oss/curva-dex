import {
    IAssetInfo,
    IBaseTradeAsset,
    IOffer,
    TradeSideConst,
    TradeSideType
} from '../../../types';
import { BaseTradeApi, IApiTradeResponce, TradeApiListnerType } from '../../../base-trade-api';

import log from '@logger' '@utils/logger';

import { pumpFunBuy, pumpFunSell, PumpFunSwapFn } from './swap';
import { priceCalc } from '@bots/traider/utils';

import { PumpFunAssetType } from '../asset-type';
import { SolanaProvider } from '@core/providers/solana';
import { parsePumpFunTx } from './tx-parser';

import { getTokenHoldersFromHeliusApi } from './holders-fetcher';

import { AccountResolver, BondingCurveAccount } from './account';
import { PublicKey } from '@solana/web3.js';

export abstract class BasePumpFunApi extends BaseTradeApi<PumpFunAssetType> {
    protected tokenPrices: Map<string, bigint> = new Map() // mint -> price
    protected bondingCurvesHistory: Map<string, BondingCurveAccount> = new Map()

    constructor() {
        super("pump-fun")
    }

    private lastInfoReqTime: number = 0
    private lastInfoReq?: IAssetInfo
    private infoReqInterval = 500

    async assetInfo(target: PumpFunAssetType): Promise<IAssetInfo|null> {
        const timeDiff = Date.now() - this.lastInfoReqTime
        if (this.lastInfoReq && timeDiff < this.infoReqInterval) {
            return this.lastInfoReq
        }
        this.lastInfoReqTime = Date.now()

        const bc = this.bondingCurvesHistory.get(target.mint) ||
            (await AccountResolver.getBondingCurveAccount(new PublicKey(target.mint)))

        if (!bc) {
            return null
        }
        this.bondingCurvesHistory.set(target.mint, bc)

        const market_cap_sol = bc.getMarketCapSOL()
        const price = bc.getBuyPrice(1n)

        const info: IAssetInfo = {
            marketCap: market_cap_sol,
            tradesVolume: 0,
            price: price, //this.tokenPrices.get(target.mint) || 0n,
            supply: bc.tokenTotalSupply,
            holders: await this.getTokenHolders(target.mint),
            complete: bc.complete
        }
        this.lastInfoReq = info

        return info
    }

    private async getTokenHolders(mint: string): Promise<number> {
        return await getTokenHoldersFromHeliusApi(mint)
    }

    abstract clone(): any
    abstract subscribeToAssetTrades<Name extends string, TxData>(mint: string, listner: TradeApiListnerType<Name, TxData>, thisArg?: any): Promise<number|void>
    abstract unsubscribeFromAssetTrades(mint: string, on_logs_sub_id: number): void
    abstract unsubscribeFromAssetFromAllListners(mint: string): void

    private async performOffer(offer: IOffer<PumpFunAssetType>, side: TradeSideType): Promise<IApiTradeResponce<PumpFunAssetType>> {
        const fn: PumpFunSwapFn = side == TradeSideConst.Buy ? pumpFunBuy : pumpFunSell
        let sign = ""
        const time = Date.now()
        try {
            sign = await fn(offer.traider.wallet.secretKey, offer.asset.mint, offer.maxSpent, offer.fee, offer.slippagePerc)
        } catch(e) {
            log.error(e)
            return {
                success: false
            }
        }

        const tx = await SolanaProvider.Instance.Connection.getTransaction(sign, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
            log.error(`PumpFunTradeApi.performOffer() Transaction not found: ${sign}`)
            return { success: false }
        }

        const parsed = parsePumpFunTx(tx)

        if (!parsed) {
            log.error(`PumpFunTradeApi.performOffer() Transaction not parsed: ${sign}`)
            return { success: false }
        }

        const preBalance = parsed.userPreLamportAmount
        const postBalance = parsed.userPostLamportAmount

        const preAssetBalance = parsed.preTokenAmount
        const postAssetBalance = parsed.postTokenAmount

        // spend assets and recive lamports on buy and vice versa
        const token_in: bigint = side == TradeSideConst.Buy ?
            postAssetBalance - preAssetBalance :
            postBalance - preBalance
        // spend lamports and recive assets on buy and vice versa
        const token_out: bigint = side == TradeSideConst.Buy ?
            postBalance - preBalance :
            postAssetBalance - preAssetBalance;

        const assetPrice = priceCalc(
            preBalance,
            postBalance,
            preAssetBalance,
            postAssetBalance
        )

        return ({
            balanceRest: postBalance,
            commit: {
                time,
                asset: offer.asset,
                side,
                in: token_in,
                out: token_out,
                assetPrice,
                fee: {
                    priority: offer.fee,
                    base: BigInt(tx!.meta!.fee)
                },
                signature: sign,
                success: true,
            },
            success: true
        })
    }

    async buy(offer: IOffer<PumpFunAssetType>): Promise<IApiTradeResponce<PumpFunAssetType>> {
        return await this.performOffer(offer, TradeSideConst.Buy)
    }

    async sell(offer: IOffer<PumpFunAssetType>): Promise<IApiTradeResponce<PumpFunAssetType>> {
        return await this.performOffer(offer, TradeSideConst.Sell)
    }

    async createAsset(asset: IBaseTradeAsset, supply: number): Promise<void> {
        asset
        supply
        throw new Error("Not implemented")
    }
}

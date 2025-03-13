import { DEFAULT_COMMITMENT, SolanaProvider } from '@core/providers/solana';
import { Logs, PublicKey, Context } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor'

import log from "@logger" '@utils/logger';

import { TradeApiListnerType } from '../../../../../base-trade-api';

import { PUMP_FUN_PROGRAM,
    PUMPFUN_BUY_LOG,
    PUMPFUN_SELL_LOG
} from './../../constants';
import { parsePumpFunTx, SwapInstructionWithBalance } from './../../tx-parser';

import { BasePumpFunApi } from './../../base-pump.fun-api';
import { PumpFun } from './idl.js';
import IDL from './idl.json'

import {
    //CreateEvent,
    EventsType,
    TradeEvent,
    //CompleteEvent,
} from './events';
import { AccountResolver } from '../../account';

export type IEventNameType = EventsType
export interface IEventTradePayloa_native extends SwapInstructionWithBalance { }
export interface IEventTradePayload_coral extends TradeEvent { }
export interface IEventTradePayload extends IEventTradePayload_coral { }
// TODO Other events mapping

export class PumpFunApi_SolImpl extends BasePumpFunApi {
    private program: Program<PumpFun>

    constructor(parentProgram?: Program<PumpFun>) {
        super()
        this.program = parentProgram || new Program<PumpFun>(
            IDL as PumpFun,
            new AnchorProvider(SolanaProvider.Instance.Connection, SolanaProvider.Instance.DummyWallet, { commitment: "confirmed" })
        );
    }

    clone() {
        return new PumpFunApi_SolImpl(this.program)
    }

    async subImplNativeLog<Name extends string = IEventNameType, TxData = IEventTradePayloa_native>(mint: string, listner: TradeApiListnerType<Name, TxData>) {
        const handlePumpTrade = async (logs: Logs, _: Context, desire_mint: string) => {
            try {
                if (
                    !logs.logs.includes(PUMPFUN_BUY_LOG) ||
                        !logs.logs.includes(PUMPFUN_SELL_LOG)
                ) {
                    return null
                }
                const tx = await SolanaProvider.Instance.Connection.getTransaction(logs.signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                })

                if (tx == null) {
                    log.warn(`Transaction not found for signature ${logs.signature}`);
                    return;
                }
                const parsed_tx = parsePumpFunTx(tx);

                if (parsed_tx?.mint.toString() === desire_mint) {
                    return parsed_tx
                }
                return null
            } catch (e) {
                log.error(`handleLogs() error: ${e}`)
                return null
            }
        };

        const sub_id = SolanaProvider.Instance.Connection.onLogs(new PublicKey(PUMP_FUN_PROGRAM), async (logs, ctx) => {
            const tx_data = await handlePumpTrade(logs, ctx, mint)
            if (tx_data) {
                const event = "trade"
                const tx = tx_data
                await listner(event as Name, tx as TxData)
            }
        })

        if (!this.assetsSubs.has(mint)) {
            this.assetsSubs.set(mint, [])
        }
        this.assetsSubs.get(mint)!.push(sub_id, listner)
        return sub_id
    }

    async subImplCoral<Name extends string = IEventNameType, TxData = IEventTradePayload_coral>(mint: string, listner: TradeApiListnerType<Name, TxData>) {
        const sub_id = this.program.addEventListener("tradeEvent", async (ev, _, sign) => {
            if (ev.mint.toString() === mint) {
                const remap = {
                    ...ev,
                    solAmount: BigInt(ev.solAmount.toString()),
                    tokenAmount: BigInt(ev.tokenAmount.toString()),
                    virtualSolReserves: BigInt(ev.virtualSolReserves.toString()),
                    virtualTokenReserves: BigInt(ev.virtualTokenReserves.toString()),
                    realSolReserves: BigInt(ev.realSolReserves.toString()),
                    realTokenReserves: BigInt(ev.realTokenReserves.toString()),
                    timestamp: ev.timestamp.toNumber(),

                    signature: sign
                }
                await listner("tradeEvent" as Name, remap as TxData)
            }
        })

        if (!this.assetsSubs.has(mint)) {
            this.assetsSubs.set(mint, [])
        }
        this.assetsSubs.get(mint)!.push(sub_id, listner)
        return sub_id
    }

    async subscribeToAssetTrades<Name extends string, TxData = IEventTradePayload>(mint: string, listner: TradeApiListnerType<Name, TxData>): Promise<number> {
        // check exisatence
        const bc = AccountResolver.getBondingCurveAccount(new PublicKey(mint), DEFAULT_COMMITMENT)
        if (!bc) {
            log.error(`PumpFunApi.subscribeToAssetTrades() pool not found for token: ${mint}`)
            throw new Error("Pool not found")
        }
        console.log("subed to: " + mint)

        return await this.subImplCoral(mint, listner)
    }

    unsubscribeFromAssetTrades(mint: string, on_logs_sub_id: number) {
        if (!this.assetsSubs.has(mint)) {
            return
        }

        const listners = this.assetsSubs.get(mint)!
        if (listners.length < 2) {
            throw new Error("PumpFunApi_SolImpl.unsubscribeFromAssetTrades() trying to unsubscribe from non existing listner with mint: " + mint)
        }

        const sub_id_ind = listners.indexOf(on_logs_sub_id)

        const sub_id = listners[sub_id_ind] as number
        const listner = listners[sub_id_ind + 1] as TradeApiListnerType<any, any>

        SolanaProvider.Instance.Connection.removeOnLogsListener(sub_id)

        this.off(mint, listner)
    }

    unsubscribeFromAssetFromAllListners(mint: string): void {
        if (!this.assetsSubs.has(mint)) {
            return
        }

        this.assetsSubs.delete(mint)
        this.removeAllListeners(mint)
    }
}

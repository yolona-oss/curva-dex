import { TradeApiListnerType } from '../../../../../base-trade-api';

import log from '@utils/logger';

import { PUMP_FUN_SOCKET_API_URL } from './../../constants';
import { BasePumpFunApi } from './../../base-pump.fun-api';

export type IPFStream_TxWsEventName = string

export interface IPFStream_TxWsPayload {
    signature: string
    sol_amount: number
    token_amount: number
    is_buy: boolean
    user: string
    timestamp: number // in seconds
    mint: string

    // HERE OTHER DATA

    market_cap: number
    usd_market_cap: number
}

type IPumpFunTxWsEvent = (IPFStream_TxWsPayload|IPFStream_TxWsEventName)[] // the first is event name, second is data

type SessionSetup = {
    sid: string
}

type IPumpFunTxWsEventWrapper = IPumpFunTxWsEvent

export class PumpFunApi_PFStreamImpl extends BasePumpFunApi {
    private static isSocketInited = false
    private static pf_socket: WebSocket

    constructor() {
        super()
        if (!PumpFunApi_PFStreamImpl.isSocketInited) {
            PumpFunApi_PFStreamImpl.pf_socket = new WebSocket(PUMP_FUN_SOCKET_API_URL)
            PumpFunApi_PFStreamImpl.isSocketInited = true
            PumpFunApi_PFStreamImpl.pf_socket.onopen = () => {
                PumpFunApi_PFStreamImpl.pf_socket.send("40")
                log.echo("Socket open")
            }
            PumpFunApi_PFStreamImpl.pf_socket.onclose = (e) => {
                if (e.code == 1000) return
            }
            PumpFunApi_PFStreamImpl.pf_socket.onerror = (e) => {
                const error = typeof e == "string" ? e : JSON.stringify(e,null,4)
                log.error(`PumpFunApi_PFStreamImpl.pf_socket.onerror() error: ${error}`)
            }
            PumpFunApi_PFStreamImpl.pf_socket.onmessage = (ev) => {
                console.log(ev.data)
                if (!ev.data) {
                    return
                }

                if (ev.data == "2") {
                    PumpFunApi_PFStreamImpl.pf_socket.send("3")
                    return
                }

                try {
                    // create ctx to setup session then change to new context that serve common packages
                    const string = String(ev.data)
                    const num1 = string.slice(0, 1)
                    const num2 = string.slice(0, 2)
                    let toParse = ""
                    if (num1 == "0") {
                        toParse = string.slice(1)
                    } else if (num2 == "40") {
                        toParse = string.slice(2)
                    }
                    if (toParse != "") {
                        const session_data = JSON.parse(toParse) as SessionSetup
                        log.echo(session_data)
                        return
                    }

                    const tx_package = JSON.parse(((ev.data) as string).slice(2)) as IPumpFunTxWsEventWrapper
                    let tx_data = tx_package[1] as IPFStream_TxWsPayload
                    let tx_event = tx_package[0] as IPFStream_TxWsEventName
                    // TODO const solution.
                    if (tx_event === "tradeCreated") {
                        tx_event = "trade"
                    }

                    tx_data.timestamp *= 1000

                    const sol = tx_data.sol_amount
                    const token = tx_data.token_amount

                    this.tokenPrices.set(tx_data.mint, BigInt((token / sol).toFixed(0)))

                    this.emit(tx_data.mint, tx_event, tx_data)
                } catch(e) {
                    log.error(ev.data)
                    log.error(`PumpFunApi_PFStreamImpl.pf_socket.onmessage() error: ${e}`)
                }
            }
        }
    }

    clone() {
        return new PumpFunApi_PFStreamImpl()
    }

    async subscribeToAssetTrades<Name extends string = IPFStream_TxWsEventName, TxData = IPFStream_TxWsPayload>(mint: string, listner: TradeApiListnerType<Name, TxData>) {
        // check exisatence
        this.addListener(mint, async (event: IPFStream_TxWsEventName, tx: IPFStream_TxWsPayload) => {
            await listner(event as Name, tx as TxData)
        })

        if (!this.assetsSubs.has(mint)) { this.assetsSubs.set(mint, []) }
        this.assetsSubs.get(mint)!.push(listner)
        return 0
    }

    unsubscribeFromAssetTrades(mint: string, listner: TradeApiListnerType<any, any>|number) {
        if (!this.assetsSubs.has(mint)) {
            return
        }

        if (typeof listner == "number") {
            throw new Error("PumpFunApi_PFStreamImpl.unsubscribeFromAssetTrades() this implementation does not support unsubscribing by sub_id: " + listner)
        }

        this.off(mint, listner as TradeApiListnerType<any, any>)
    }

    unsubscribeFromAssetFromAllListners(mint: string): void {
        if (!this.assetsSubs.has(mint)) {
            return
        }

        this.assetsSubs.delete(mint)
        this.removeAllListeners(mint)
    }
}

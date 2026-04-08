import {
    // native
    PumpFunApi_SolImpl as SolImpl_Api,
    IEventTradePayload as SolImpl_EventTradePayload,

    // third-party pump.fun socket api
    PumpFunApi_PFStreamImpl as StreamImpl_Api,
    IPFStream_TxWsPayload as StreamImpl_EventTradePayload
} from "./ev-impl"

type PumpFunApiImplVersion = "pump-fun-sol-log" | "pump-fun-stream"
const InUseApiImpl: PumpFunApiImplVersion = "pump-fun-sol-log" // "pump-fun-stream"

type ApiPayloadVariant<T extends PumpFunApiImplVersion> = T extends "pump-fun-sol-log" ?
                                                                    SolImpl_EventTradePayload :
                                                                        T extends "pump-fun-stream" ?
                                                                            StreamImpl_EventTradePayload :
                                                                                never

export type IPumpFun_TxEventName = string
export type IPumpFun_TxEventPayload = ApiPayloadVariant<typeof InUseApiImpl>

const SelApiImpl = InUseApiImpl === "pump-fun-sol-log" ? SolImpl_Api : StreamImpl_Api

// TODO
//export const PumpFunApi = Object.assign({}, SelApiImpl)

//interface IPF_Factory {
//    produce(): 
//}
//
//export class PFApi_Sol_Log_Factory {
//    constructor() { }
//
//    produce() {
//        return new PumpFunApi_SolImpl()
//    }
//}
//
//export class PFApi_PF_Stream_Factory {
//    constructor() { }
//
//    produce() {
//        return new PumpFunApi_PFStreamImpl()
//    }
//}
//
//cosnt PFApiFactory = 

export { SolImpl_Api as PumpFunApi }

//type ApiCaseExtension<T extends string> = T extends "pump-fun-sol-log" ? PumpFunApi_SolImpl : T extends "pump-fun-stream" ? PumpFunApi_PFStreamImpl : never
//export class PumpFunApi<T extends PumpFunApiImplType = "pump-fun-sol-log"> extends ApiCaseExtension<T> { }

export const PumpFunApiProvider = new SelApiImpl()

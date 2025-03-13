import { BaseTradeApi } from "./base-trade-api";
import { ICmdPushOfferOpts, CmdOfferBuilder } from "./offer-cmd";
import { IBaseTradeAsset } from "./types";
import { IVerificationCond } from "./offer-cmd";

export interface IMTC_PushOfferVarificationOpts<Api extends BaseTradeApi<any>, Asset extends IBaseTradeAsset> {
    balance?: boolean // check balance for asset or native currency for perform trade
    condition?: IVerificationCond<Api, Asset>
}

export interface IMTC_OfferOpts<Api extends BaseTradeApi<any>, Asset extends IBaseTradeAsset> {
    cmdOpts: ICmdPushOfferOpts<Asset>
    slaveVerification: IMTC_PushOfferVarificationOpts<Api, Asset>
}

export class MTC_OfferBuilder<Api extends BaseTradeApi<any>, Asset extends IBaseTradeAsset> {
    private slaveVerification: IMTC_PushOfferVarificationOpts<Api, Asset> = {}
    private cmdOfferBuilder = new CmdOfferBuilder<Asset>()

    constructor() { }

    setVerificationCond(cond: IVerificationCond<Api, Asset>) {
        this.slaveVerification.condition = cond
        return this
    }

    setVerificationBalance(balance: boolean = true) {
        this.slaveVerification.balance = balance
        return this
    }

    get offerBuilder() {
        return this.cmdOfferBuilder
    }

    build(): IMTC_OfferOpts<Api, Asset> {
        return {
            cmdOpts: this.cmdOfferBuilder.build(),
            slaveVerification: this.slaveVerification
        }
    }
}


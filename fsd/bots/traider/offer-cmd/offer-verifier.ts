import { MasterTraderCtrl } from "./../mtc"
import { BaseTradeApi } from "./../base-trade-api"
import { IBaseTradeAsset, IOffer, TradeSideConst } from "./../types"
import { BaseWalletManager } from "./../wallet-manager"
import { TradeSideType } from "./../types"
import { SlaveTraderCtrl } from "../stc"

export enum IOfferVerifyError {
    NotEnoughBalanceNative,
    NotEnoughBalanceToken,
}

export type IVerificationCond<Api extends BaseTradeApi<any>, Asset extends IBaseTradeAsset> = (master: MasterTraderCtrl<Api, Asset>, slave: SlaveTraderCtrl<Api, Asset>) => Promise<IOfferVerifyError>

export class OfferVerifier {
    static async verifyBalance<TradeApi extends BaseTradeApi<AssetType>, AssetType extends IBaseTradeAsset, WMType extends BaseWalletManager>(
        slave_id: string,
        master: MasterTraderCtrl<TradeApi, AssetType, WMType>,
        offer: IOffer<AssetType>,
        side: TradeSideType
    ): Promise<IOfferVerifyError|null> {
        // TODO : !! add slipage and fee check !!
        if (side === TradeSideConst.Buy) {
            const slaveBalance = await master.getSalveBalanceNative(slave_id)
            if (slaveBalance.amount < offer.maxSpent) {
                return IOfferVerifyError.NotEnoughBalanceNative
            }
        } else {
            const slaveBalance = await master.getSlaveBalanceForAsset(slave_id, offer.asset.mint)
            if (!slaveBalance) {
                return IOfferVerifyError.NotEnoughBalanceToken
            }
            if (slaveBalance.amount < offer.maxSpent) {
                return IOfferVerifyError.NotEnoughBalanceToken
            }
        }

        return null
    }

    static verifyErrorToError(err: IOfferVerifyError): string {
        switch (err) {
            case IOfferVerifyError.NotEnoughBalanceNative:
                return "Not enough balance native"
            case IOfferVerifyError.NotEnoughBalanceToken:
                return "Not enough balance token"
        }
    }
}

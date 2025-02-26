"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferVerifier = exports.IOfferVerifyError = void 0;
const types_1 = require("./../types");
var IOfferVerifyError;
(function (IOfferVerifyError) {
    IOfferVerifyError[IOfferVerifyError["NotEnoughBalanceNative"] = 0] = "NotEnoughBalanceNative";
    IOfferVerifyError[IOfferVerifyError["NotEnoughBalanceToken"] = 1] = "NotEnoughBalanceToken";
})(IOfferVerifyError || (exports.IOfferVerifyError = IOfferVerifyError = {}));
class OfferVerifier {
    static async verifyBalance(slave_id, master, offer, side) {
        if (side === types_1.TradeSideConst.Buy) {
            const slaveBalance = await master.getSalveBalanceNative(slave_id);
            if (slaveBalance.amount < offer.maxSpent) {
                return IOfferVerifyError.NotEnoughBalanceNative;
            }
        }
        else {
            const slaveBalance = await master.getSlaveBalanceForAsset(slave_id, offer.asset.mint);
            if (!slaveBalance) {
                return IOfferVerifyError.NotEnoughBalanceToken;
            }
            if (slaveBalance.amount < offer.maxSpent) {
                return IOfferVerifyError.NotEnoughBalanceToken;
            }
        }
        return null;
    }
    static verifyErrorToError(err) {
        switch (err) {
            case IOfferVerifyError.NotEnoughBalanceNative:
                return "Not enough balance native";
            case IOfferVerifyError.NotEnoughBalanceToken:
                return "Not enough balance token";
        }
    }
}
exports.OfferVerifier = OfferVerifier;

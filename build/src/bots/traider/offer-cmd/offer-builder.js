"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdOfferBuilder = void 0;
const constants_1 = require("../constants");
class CmdOfferBuilder {
    offer = {};
    setup = {};
    decline = {};
    exe = {};
    setTraider(traider) {
        this.offer.traider = traider;
        return this;
    }
    setAsset(asset) {
        this.offer.asset = asset;
        return this;
    }
    setMaxSpent(maxSpent) {
        this.offer.maxSpent = maxSpent;
        return this;
    }
    setSlippagePerc(slippagePerc) {
        if (slippagePerc < 0 || slippagePerc > constants_1.MAX_SLIPPAGE_DECIMAL) {
            throw new Error("Slippage percentage must be between 0 and " + constants_1.MAX_SLIPPAGE_DECIMAL);
        }
        this.offer.slippagePerc = slippagePerc;
        return this;
    }
    setFee(fee) {
        this.offer.fee = fee;
        return this;
    }
    setDeclineCond(declineCond) {
        this.decline.declineCond = declineCond;
        return this;
    }
    setDeclineCascade(declineCascade) {
        this.decline.declineCascade = declineCascade;
        return this;
    }
    setRetries(retries) {
        this.exe.retries = retries;
        return this;
    }
    setTimeout(timeout) {
        this.exe.timeout = timeout;
        return this;
    }
    setDelay(delay) {
        this.exe.delay = delay;
        return this;
    }
    build() {
        if (!this.offer.traider) {
            throw new Error("Traider is not set");
        }
        if (!this.offer.asset) {
            throw new Error("Asset is not set");
        }
        if (!this.offer.maxSpent) {
            throw new Error("Max spent is not set");
        }
        return {
            offer: this.offer,
            setup: this.setup,
            decline: this.decline,
            exe: this.exe
        };
    }
}
exports.CmdOfferBuilder = CmdOfferBuilder;

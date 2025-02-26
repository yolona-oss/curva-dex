"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTC_OfferBuilder = void 0;
const offer_cmd_1 = require("./offer-cmd");
class MTC_OfferBuilder {
    slaveVerification = {};
    cmdOfferBuilder = new offer_cmd_1.CmdOfferBuilder();
    constructor() { }
    setVerificationCond(cond) {
        this.slaveVerification.condition = cond;
        return this;
    }
    setVerificationBalance(balance = true) {
        this.slaveVerification.balance = balance;
        return this;
    }
    get offerBuilder() {
        return this.cmdOfferBuilder;
    }
    build() {
        return {
            cmdOpts: this.cmdOfferBuilder.build(),
            slaveVerification: this.slaveVerification
        };
    }
}
exports.MTC_OfferBuilder = MTC_OfferBuilder;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunSlave = void 0;
const stc_1 = require("../../stc");
const api_1 = require("./api");
class PumpFunSlave extends stc_1.SlaveTraderCtrl {
    constructor(id, owner, wallet, sequalizer) {
        super(id, owner, api_1.PumpFunApiProvider, wallet, sequalizer);
    }
    clone(newId, newOwner, newTraider, sequalizer) {
        return new PumpFunSlave(newId, newOwner, newTraider.wallet, sequalizer ?? this.sequalizer);
    }
}
exports.PumpFunSlave = PumpFunSlave;

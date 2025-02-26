"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleSlave = void 0;
const stc_1 = require("../../stc");
const api_1 = require("./api");
class ExampleSlave extends stc_1.SlaveTraderCtrl {
    constructor(id, owner, wallet, sequalizer) {
        super(id, owner, new api_1.ExampleTradeApi(), Object.assign({}, wallet), sequalizer);
    }
    clone(newId, newOwner, newTraider, newSequalizer) {
        return new ExampleSlave(newId, newOwner, newTraider.wallet, newSequalizer);
    }
}
exports.ExampleSlave = ExampleSlave;

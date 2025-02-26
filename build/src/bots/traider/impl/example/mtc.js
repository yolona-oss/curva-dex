"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleMaster = void 0;
const mtc_1 = require("@bots/traider/mtc");
const api_1 = require("./api");
class ExampleMaster extends mtc_1.MasterTraderCtrl {
    constructor(id, owner, asset, initialSalves) {
        super(Object.assign({}, asset), new Array().concat(initialSalves ?? []), new api_1.ExampleTradeApi(), owner, id);
    }
    onTrade(_, __) {
        throw new Error("Method not implemented.");
    }
    clone(id, newOwner, newAsset, newSlaves) {
        return new ExampleMaster(id, newOwner, newAsset, newSlaves ?? []);
    }
}
exports.ExampleMaster = ExampleMaster;

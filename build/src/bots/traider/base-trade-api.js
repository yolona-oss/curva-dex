"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTradeApi = void 0;
const events_1 = require("events");
class BaseTradeApi extends events_1.EventEmitter {
    id;
    assetsSubs = new Map();
    constructor(id) {
        super();
        this.id = id;
    }
}
exports.BaseTradeApi = BaseTradeApi;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferCmd = void 0;
const events_1 = require("events");
const trade_1 = require("./../types/trade");
const async_tools_1 = require("@utils/async-tools");
class OfferCmd extends events_1.EventEmitter {
    id;
    api;
    cmd_opt;
    side;
    constructor(config) {
        super();
        this.id = config.id;
        this.api = config.api.clone();
        this.cmd_opt = Object.assign({}, config.cmd_opt);
        this.side = config.side;
    }
    async execute() {
        const offer = this.cmd_opt.offer;
        const { exe } = this.cmd_opt;
        const { retries, timeout } = exe;
        const { declineCond, declineCascade } = this.cmd_opt.decline;
        const id = this.id;
        const offerFn = this.side === trade_1.TradeSideConst.Buy ? this.api.buy : this.api.sell;
        if (declineCond) {
            if (await declineCond(this.cmd_opt.offer)) {
                if (declineCascade) {
                    this.emit("DropAll", id);
                    return;
                }
                this.emit("DropOne", id);
                return;
            }
        }
        const start = performance.now();
        let exeRes = await (0, async_tools_1.retrier)(async () => await offerFn({
            ...offer,
        }), {
            retries: retries || 1,
            timeout: timeout
        });
        const delta = performance.now() - start;
        this.emit("Done", id, delta, exeRes.success, exeRes.commit);
    }
}
exports.OfferCmd = OfferCmd;

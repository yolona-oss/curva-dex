"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTicker = exports.AbstractTTikerCtx = exports.BaseTTikerState = void 0;
const state_1 = require("@core/types/state");
const time_1 = require("@utils/time");
class BaseTTikerState extends state_1.AbstractState {
}
exports.BaseTTikerState = BaseTTikerState;
class AbstractTTikerCtx {
    state;
    constructor(state) {
        this.state = state;
        this.transitionTo(state);
    }
    transitionTo(state) {
        this.state = state;
        this.state.setContext(this);
    }
}
exports.AbstractTTikerCtx = AbstractTTikerCtx;
class TTicker {
    _isRunning = false;
    ctx;
    interval = 100;
    constructor(ctx) {
        this.ctx = ctx;
    }
    setState(state) {
        this.ctx.transitionTo(state);
    }
    isRunning() {
        return this._isRunning;
    }
    setInterval(interval) {
        this.interval = interval;
    }
    async run() {
        if (this._isRunning) {
            throw new Error("Already running");
        }
        this._isRunning = true;
        while (this._isRunning) {
            const startTime = performance.now();
            await this.ctx.tick();
            const elapsedTime = performance.now() - startTime;
            if (elapsedTime < this.interval) {
                await (0, time_1.sleep)(this.interval - elapsedTime);
            }
        }
        await this.ctx.exit();
    }
    async terminate() {
        if (!this._isRunning) {
            throw new Error("Not running");
        }
        this._isRunning = false;
    }
}
exports.TTicker = TTicker;

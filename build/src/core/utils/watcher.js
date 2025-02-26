"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Watcher = void 0;
const events_1 = require("events");
const time_1 = require("./time");
const logger_1 = __importDefault(require("./logger"));
const defaultMarketWatcherOpts = {
    argession: 0.5,
    freq: 1
};
class Watcher extends events_1.EventEmitter {
    watchFn;
    opts;
    active = false;
    sleepTime;
    constructor(watchFn, opts) {
        super();
        this.watchFn = watchFn;
        this.opts = opts;
        this.opts = {
            ...defaultMarketWatcherOpts,
            ...opts
        };
        this.sleepTime = 1000 / this.opts.freq;
    }
    isRunning() {
        return this.active;
    }
    get Settings() {
        return this.opts;
    }
    async updateState(f) {
        let restart = false;
        if (this.active) {
            await this.terminate();
            restart = true;
        }
        f();
        if (restart) {
            this.run();
        }
    }
    async setFreq(hz) {
        return await this.updateState(() => {
            this.opts.freq = hz,
                this.sleepTime = 1000 / hz;
        });
    }
    async run() {
        if (this.active) {
            throw "Watcher.run() called when not active";
        }
        this.active = true;
        this.watch();
    }
    async watch() {
        const iter_start = new Date().getTime();
        try {
            await this.watchFn();
        }
        catch (e) {
            logger_1.default.error("Cannot analize:", e);
        }
        if (!this.active) {
            this.emit("terminated");
            return;
        }
        else {
            const elapced = new Date().getTime() - iter_start;
            if (this.sleepTime - elapced > 0) {
                await (0, time_1.sleep)(this.sleepTime - elapced);
            }
            await this.watch();
        }
    }
    async terminate() {
        return new Promise(resolve => {
            if (!this.active) {
                throw new Error("Watcher.terminate() called when not active");
            }
            this.active = false;
            this.on("terminated", () => resolve);
        });
    }
}
exports.Watcher = Watcher;

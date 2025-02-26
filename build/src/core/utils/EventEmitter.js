"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
const events_1 = require("events");
class EventEmitter {
    emitter = new events_1.EventEmitter();
    on(eventName, fn) {
        this.emitter.on(eventName, fn);
    }
    off(eventName, fn) {
        this.emitter.off(eventName, fn);
    }
    emit(eventName, ...params) {
        this.emitter.emit(eventName, ...params);
    }
}
exports.EventEmitter = EventEmitter;

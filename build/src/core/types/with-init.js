"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithInit = void 0;
class WithInit {
    _isInitialized = false;
    setInitialized() {
        this._isInitialized = true;
    }
    setUninitialized() {
        this._isInitialized = false;
    }
    isInitialized() {
        return this._isInitialized;
    }
}
exports.WithInit = WithInit;

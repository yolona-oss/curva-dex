"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeArchImplRegistry = void 0;
class TradeArchImplRegistry {
    impls = new Array();
    static __instance;
    constructor() { }
    static get Instance() {
        return this.__instance || (this.__instance = new this());
    }
    register({ name, api, mtc, stc, walletManager }) {
        if (this.has(name)) {
            throw new Error(`bot impl ${name} already exists`);
        }
        this.impls.push({ name, api, mtc, stc, walletManager });
    }
    get(name) {
        return this.impls.find(i => i.name === name);
    }
    has(name) {
        return !!this.get(name);
    }
    avaliable() {
        return this.impls.map(i => i.name);
    }
}
exports.TradeArchImplRegistry = TradeArchImplRegistry;

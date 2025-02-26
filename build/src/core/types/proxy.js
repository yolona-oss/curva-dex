"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Proxy = exports.ProxyTypeSign = void 0;
const superstruct_1 = require("superstruct");
exports.ProxyTypeSign = (0, superstruct_1.object)({
    host: (0, superstruct_1.string)(),
    port: (0, superstruct_1.number)(),
    protocol: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    auth: (0, superstruct_1.optional)((0, superstruct_1.object)({
        user: (0, superstruct_1.string)(),
        password: (0, superstruct_1.string)()
    }))
});
class Proxy {
    host;
    port;
    protocol;
    auth;
    constructor(proxy) {
        this.host = proxy.host;
        this.port = proxy.port;
        this.protocol = proxy.protocol || "http";
        this.auth = proxy.auth;
    }
    toString() {
        return this.protocol + (this.auth ? this.auth.user + ":" + this.auth.password + "@" : "") + this.host + ":" + this.port;
    }
}
exports.Proxy = Proxy;

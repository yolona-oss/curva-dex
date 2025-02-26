"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunApiProvider = exports.PumpFunApi = void 0;
const ev_impl_1 = require("./ev-impl");
Object.defineProperty(exports, "PumpFunApi", { enumerable: true, get: function () { return ev_impl_1.PumpFunApi_SolImpl; } });
const InUseApiImpl = "pump-fun-sol-log";
const SelApiImpl = InUseApiImpl === "pump-fun-sol-log" ? ev_impl_1.PumpFunApi_SolImpl : ev_impl_1.PumpFunApi_PFStreamImpl;
exports.PumpFunApiProvider = new SelApiImpl();

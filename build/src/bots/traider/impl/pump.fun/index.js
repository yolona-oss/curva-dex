"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunSlave = exports.PumpFunMaster = void 0;
__exportStar(require("./api"), exports);
var mtc_1 = require("./mtc");
Object.defineProperty(exports, "PumpFunMaster", { enumerable: true, get: function () { return mtc_1.PumpFunMaster; } });
var stc_1 = require("./stc");
Object.defineProperty(exports, "PumpFunSlave", { enumerable: true, get: function () { return stc_1.PumpFunSlave; } });

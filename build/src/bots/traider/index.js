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
exports.BaseTTikerState = exports.TTicker = exports.AbstractTTikerCtx = exports.BuiltInNames = exports.TradeArchImplRegistry = exports.OfferCmd = exports.BotDrivenCurve = exports.ExCurve = exports.BaseTradeApi = exports.STCMetrics = exports.SlaveTraderCtrl = exports.MasterTraderCtrl = void 0;
__exportStar(require("./types"), exports);
var mtc_1 = require("./mtc");
Object.defineProperty(exports, "MasterTraderCtrl", { enumerable: true, get: function () { return mtc_1.MasterTraderCtrl; } });
var stc_1 = require("./stc");
Object.defineProperty(exports, "SlaveTraderCtrl", { enumerable: true, get: function () { return stc_1.SlaveTraderCtrl; } });
var stc_metric_1 = require("./stc-metric");
Object.defineProperty(exports, "STCMetrics", { enumerable: true, get: function () { return stc_metric_1.STCMetrics; } });
__exportStar(require("./wallet-manager"), exports);
var base_trade_api_1 = require("./base-trade-api");
Object.defineProperty(exports, "BaseTradeApi", { enumerable: true, get: function () { return base_trade_api_1.BaseTradeApi; } });
var curve_1 = require("./curve");
Object.defineProperty(exports, "ExCurve", { enumerable: true, get: function () { return curve_1.ExCurve; } });
var bot_driven_curve_1 = require("./bot-driven-curve");
Object.defineProperty(exports, "BotDrivenCurve", { enumerable: true, get: function () { return bot_driven_curve_1.BotDrivenCurve; } });
var offer_cmd_1 = require("./offer-cmd");
Object.defineProperty(exports, "OfferCmd", { enumerable: true, get: function () { return offer_cmd_1.OfferCmd; } });
var impl_1 = require("./impl");
Object.defineProperty(exports, "TradeArchImplRegistry", { enumerable: true, get: function () { return impl_1.TradeArchImplRegistry; } });
Object.defineProperty(exports, "BuiltInNames", { enumerable: true, get: function () { return impl_1.BuiltInNames; } });
var ttiker_1 = require("./ttiker");
Object.defineProperty(exports, "AbstractTTikerCtx", { enumerable: true, get: function () { return ttiker_1.AbstractTTikerCtx; } });
Object.defineProperty(exports, "TTicker", { enumerable: true, get: function () { return ttiker_1.TTicker; } });
Object.defineProperty(exports, "BaseTTikerState", { enumerable: true, get: function () { return ttiker_1.BaseTTikerState; } });

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotDrivenCurve = void 0;
const logger_1 = __importDefault(require("@utils/logger"));
const path_1 = __importDefault(require("path"));
const built_in_1 = require("./impl/built-in");
const curve_1 = require("./curve");
const fs_1 = require("@utils/fs");
const ex_curve_dir_name = "ex-curve";
class BotDrivenCurve extends curve_1.ExCurve {
    owner;
    constructor(owner, initial) {
        super(initial);
        this.owner = owner;
    }
    static loadFromFile(owner, curve_id) {
        const data = (0, fs_1.loadFromJson)(path_1.default.join(owner, ex_curve_dir_name), curve_id);
        if (data != null) {
            if (Array.isArray(data)) {
                try {
                    return new BotDrivenCurve(owner, data);
                }
                catch (e) {
                    logger_1.default.error(`Error loading ex-curve from file: ${e}`);
                }
            }
        }
        logger_1.default.warn("Curve file not found: " + curve_id, ". Creating new curve...");
        const instance = new BotDrivenCurve(owner);
        if (owner !== built_in_1.BLANK_INSTANCE_ID_PREFIX) {
            instance.saveToFile(curve_id);
        }
        return instance;
    }
    saveToFile(curve_id) {
        if (curve_id.includes(built_in_1.BLANK_INSTANCE_ID_PREFIX)) {
            return;
        }
        (0, fs_1.writeJsonData)([this.owner, ex_curve_dir_name], curve_id, this.trades.map(t => ({
            ...t,
            price: t.price.toString(),
            quantity: t.quantity.toString()
        })));
    }
}
exports.BotDrivenCurve = BotDrivenCurve;

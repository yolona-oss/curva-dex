"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const logger_1 = __importDefault(require("../logger"));
class Logger {
    bindingName;
    constructor(bindingName) {
        this.bindingName = bindingName;
    }
    log(message) {
        logger_1.default.echo(`${this.bindingName}: ${message}`);
    }
}
exports.Logger = Logger;

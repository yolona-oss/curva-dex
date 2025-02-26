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
exports.WELCOME_TEXT = exports.FIGLET_LOGO = exports.main_config_path = void 0;
var path_1 = require("./path");
Object.defineProperty(exports, "main_config_path", { enumerable: true, get: function () { return path_1.main_config_path; } });
__exportStar(require("./command"), exports);
var logo_1 = require("./logo");
Object.defineProperty(exports, "FIGLET_LOGO", { enumerable: true, get: function () { return logo_1.FIGLET_LOGO; } });
var welcome_1 = require("./welcome");
Object.defineProperty(exports, "WELCOME_TEXT", { enumerable: true, get: function () { return welcome_1.WELCOME_TEXT; } });

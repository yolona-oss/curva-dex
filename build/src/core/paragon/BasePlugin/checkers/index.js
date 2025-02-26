"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_js_1 = require("./common.js");
const Plugin_js_1 = require("@paragon/Types/Plugin.js");
const plugin = {
    name: "Base chechers",
    type: Plugin_js_1.PlugTypeEnum.Checker,
    checkers: common_js_1.checkers
};
exports.default = plugin;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePluginSign = exports.CheckerPluginSign = exports.ExecutorPluginSign = exports.PluginSign = exports.PluginTypeSign = exports.PlugTypeEnum = void 0;
const superstruct_1 = require("superstruct");
const Command_js_1 = require("./Command.js");
const Conditional_js_1 = require("./Conditional.js");
var PlugTypeEnum;
(function (PlugTypeEnum) {
    PlugTypeEnum["Executor"] = "Executor";
    PlugTypeEnum["Checker"] = "Checker";
    PlugTypeEnum["Database"] = "Database";
    PlugTypeEnum["Merged"] = "Merged";
})(PlugTypeEnum || (exports.PlugTypeEnum = PlugTypeEnum = {}));
exports.PluginTypeSign = (0, superstruct_1.enums)(["Executor", "Checker", "Database", "Merged"]);
exports.PluginSign = (0, superstruct_1.object)({
    name: (0, superstruct_1.string)(),
    type: exports.PluginTypeSign,
});
exports.ExecutorPluginSign = (0, superstruct_1.assign)((0, superstruct_1.object)({
    state: (0, superstruct_1.any)(),
    commands: (0, superstruct_1.array)(Command_js_1.CommandSign),
    actions: (0, superstruct_1.array)((0, superstruct_1.string)())
}), exports.PluginSign);
exports.CheckerPluginSign = (0, superstruct_1.assign)((0, superstruct_1.object)({
    checkers: (0, superstruct_1.array)(Conditional_js_1.CheckObjSign),
}), exports.PluginSign);
exports.DatabasePluginSign = (0, superstruct_1.assign)((0, superstruct_1.object)({}), exports.PluginSign);

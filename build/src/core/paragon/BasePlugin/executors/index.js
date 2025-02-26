"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const state_js_1 = require("./state.js");
const commands_js_1 = require("./commands.js");
const Plugin_1 = require("@paragon/Types/Plugin");
const plugin = {
    name: "Base commands",
    type: Plugin_1.PlugTypeEnum.Executor,
    commands: commands_js_1.commands,
    actions: state_js_1.actions,
    state: state_js_1.StateSign,
};
exports.default = plugin;

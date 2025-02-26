"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutableBuilder = void 0;
const Executable_js_1 = require("./../Executable/Executable.js");
class ExecutableBuilder {
    plugins;
    script;
    constructor(plugins, script) {
        this.plugins = plugins;
        this.script = script;
    }
    async pluginsMegre() {
        let commands = [];
        let states = [];
        let actions = [];
        let checkers = [];
        for (const plugin of this.plugins) {
            if (plugin.type === "Executor") {
                let eplugin = plugin;
                states.push(eplugin.state);
                commands.push(...eplugin.commands);
                actions.push(...eplugin.actions);
            }
            else if (plugin.type === "Checker") {
                let chplugin = plugin;
                checkers.push(...chplugin.checkers);
            }
            else if (plugin.type === "Database") {
            }
            else {
            }
        }
        const mergedEPlugin = {
            name: "MergedEPlugin",
            commands: commands,
            type: "Merged",
            actions: actions
        };
        const mergedChPlugin = {
            name: "MergedChPlugin",
            type: "Merged",
            checkers: checkers
        };
        const mergedDbPlugin = {
            name: "MergedDbPlugin",
            type: "Merged",
        };
        return {
            executors: mergedEPlugin,
            checkers: mergedChPlugin,
            database: mergedDbPlugin
        };
    }
    async build() {
        const plugins = await this.pluginsMegre();
        let executable = new Executable_js_1.Executable(this.script, plugins.executors.commands, plugins.checkers.checkers);
        return executable;
    }
}
exports.ExecutableBuilder = ExecutableBuilder;

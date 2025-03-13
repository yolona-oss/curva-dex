import {
    Plugin,
    ExecutorPlugin,
    CheckerPlugin,
    DatabasePlugin
} from './../Types/Plugin.js'

import { script } from './../Types/script.js'
import { Executable } from './../Executable/Executable.js'
import { Command } from '../Types/Command.js'
import { CheckObj } from '../Types/Conditional.js'

export class ExecutableBuilder {
    constructor(
        private plugins: Plugin[],
        private script: script,
    ) {
    }

    private async pluginsMegre() {
        let commands = [ ]
        let states = [ ]
        let actions = [ ]
        let checkers = [ ]
        for (const plugin of this.plugins) {
            if (plugin.type === "Executor") {
                let eplugin: ExecutorPlugin = <ExecutorPlugin>plugin
                states.push(eplugin.state)
                commands.push(...eplugin.commands)
                actions.push(...eplugin.actions)
            } else if (plugin.type === "Checker") {
                let chplugin: CheckerPlugin = <CheckerPlugin>plugin
                checkers.push(...chplugin.checkers)
            } else if (plugin.type === "Database") {
                // TODO
            } else {
                // TODO
            }
        }

        const mergedEPlugin: ExecutorPlugin = {
            name: "MergedEPlugin",
            commands: commands,
            type: "Merged",
            actions: actions
        }

        const mergedChPlugin: CheckerPlugin = {
            name: "MergedChPlugin",
            type: "Merged",
            checkers: checkers
        }

        // TODO
        const mergedDbPlugin: DatabasePlugin = {
            name: "MergedDbPlugin",
            type: "Merged",
        }

        return {
            executors: mergedEPlugin,
            checkers: mergedChPlugin,
            database: mergedDbPlugin
        }
    }

    async build() {
        const plugins = await this.pluginsMegre()
        let executable = new Executable<typeof plugins.executors.state>(
            this.script,
            <Command<any>[]>plugins.executors.commands,
            <CheckObj[]>plugins.checkers.checkers)
        return executable
    }
}

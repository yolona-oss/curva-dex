import { CLIContext } from './types';
import { CHComposer } from '@core/ui/cmd-traspiler';

import { WithInit } from '@core/types/with-init';
import { IUI } from '@core/ui/types'
import { AvailableUIsEnum, AvailableUIsType } from '@core/ui/impls';
import { FilesWrapper, Manager } from '@core/db';

import { LockManager } from '@utils/lock-manager';
import logger from '@logger';

import readline from 'readline';

export class CLIUI extends WithInit implements IUI<CLIContext> {
    private context: CLIContext;
    private rl?: readline.Interface
    private isActive: boolean = false
    private cmds: string[]

    constructor(
        public readonly chComposer: CHComposer<CLIContext>
    ) {
        super()
        this.context = {
            type: AvailableUIsEnum.CLI,
            //manager: {},
            userSession: { state: '', data: {} },
            text: "",
            reply: async (message: string) => {
                console.log('[' + new Date().toLocaleTimeString("ru") + ']' + "[CLI] < " + message);
            }
        };
        this.cmds = this.chComposer.toUICommands().map(cmd => cmd.command)
        console.log(this.cmds)
        this.setInitialized()
    }

    printCommands(): void {
        console.log(this.cmds)
    }

    lock(_: LockManager): boolean {
        return true
    }

    unlock(_: LockManager): boolean {
        return true
    }

    ContextType(): AvailableUIsType {
        return AvailableUIsEnum.CLI
    }

    isRunning(): boolean {
        return this.isActive
    }

    async run() {
        if (!this.isInitialized()) {
            throw new Error("CLIUI::run() not initialized")
        }

        if (this.isActive) {
            throw new Error("CLIUI::run() already running")
        }

        let manager = await Manager.findOne({userId: -1})
        if (!manager) {
            const avatar = await FilesWrapper.getDefaultAvatar()
            if (!avatar) {
                throw new Error("Default avatar not found")
            }

            manager = await Manager.create({
                isAdmin: true,
                name: "CliAdmin",
                userId: -1,
                online: false,
                avatar: avatar.id,
                useGreeting: true
            })
        }
        this.context.manager = manager

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100,
            prompt: "[CLI] >",
            completer: (line: string) => {
                const completions = this.cmds.filter((c) => c.startsWith(line));
                return completions
            }
        });

        log.info("Starting CLI...")

        this.rl.on('line', async (line) => {
            this.context.text = line;
            const [command, ...args] = line.split(' ');
            this.context.userSession.data.args = args; // Save args in context

            const response = await this.chComposer!.handleCommand(command, this.context);
            if (response.markup?.text) {
                this.context.reply(String(response.markup.text));
            }
        });

        this.isActive = true
    }

    async terminate() {
        if (!this.isActive) {
            throw new Error("CLIUI::terminate() not running")
        }
        if (this.rl) {
            this.rl.close()
        }
        await this.chComposer.stopAllServices()
        this.isActive = false
        log.info(" -- CLI ui stopped");
    }
}

import { CLIContext } from './types';
import { CmdDispatcher, CLI_USER_ID, CLI_USER_NAME } from '@core/ui/command-processor';

import { WithInit } from '@core/types/with-init';
import { IUI } from '@core/ui/types'
import { AvailableUIsEnum, AvailableUIsType } from '@core/ui/impls';
import { FilesWrapper, IManager, Manager } from '@core/db';

import { LockManager } from '@utils/lock-manager';
import log from '@logger';

import readline from 'readline';

export class CLIUI extends WithInit implements IUI<CLIContext> {
    private context: CLIContext;
    private rl?: readline.Interface
    private isActive: boolean = false
    private cmds: string[]

    constructor(
        public readonly dispatcher: CmdDispatcher<CLIContext>
    ) {
        super()
        this.context = {
            type: AvailableUIsEnum.CLI,
            manager: {} as IManager & { userId: number|string },
            userSession: { state: '', data: {} },
            text: "",
            reply: async (message: string) => {
                console.log('[' + new Date().toLocaleTimeString("ru") + ']' + "[CLI] < " + message);
            }
        };
        this.cmds = this.dispatcher.toUICommands().map(cmd => cmd.command)
        console.log(this.cmds)
        this.setInitialized()
    }

    consolePrintCommands(): void {
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

        let manager = await Manager.findOne({userId: CLI_USER_ID})
        if (!manager) {
            const avatar = await FilesWrapper.getDefaultAvatar()
            if (!avatar) {
                throw new Error("Default avatar not found")
            }

            manager = await Manager.create({
                isAdmin: true,
                name: CLI_USER_NAME,
                userId: CLI_USER_ID,
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

            const response = await this.dispatcher!.handleCommand(command, line, this.context);
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
        await this.dispatcher.stopAllServices()
        this.isActive = false
        log.info(" -- CLI ui stopped");
    }
}

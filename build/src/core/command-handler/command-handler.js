"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
const command_1 = require("@core/constants/command");
const db_1 = require("@core/db");
const with_init_1 = require("@core/types/with-init");
const with_neighbors_1 = require("@core/types/with-neighbors");
const logger_1 = __importDefault(require("@utils/logger"));
const sequence_handler_1 = require("./sequence-handler");
const DefaultCommands = [
    ...Object.values(command_1.DefaultSeqCommandsEnum),
    ...Object.values(command_1.DefaultServiceCommandsEnum),
    ...Object.values(command_1.DefaultAccountCommandsEnum),
    ...Object.values(command_1.DefaultHelpCommandsEnum)
];
class CommandHandler extends with_init_1.WithInit {
    callbacks;
    sequenceHandler;
    activeServices = new Map();
    constructor() {
        super();
        this.callbacks = new Map();
    }
    done() {
        if (!(0, with_neighbors_1.validateWithNeighborsMap)(this.callbacks)) {
            throw new Error("CommandHandler::done() invalid callbacks map");
        }
        const targets = Array.from(this.callbacks.keys());
        const naighbors = Array.from(this.callbacks.values());
        this.sequenceHandler = new sequence_handler_1.SequenceHandler(Array.from(targets.map((v, i) => ({
            target: v,
            next: naighbors[i].next,
            prev: naighbors[i].prev
        }))));
        this.setInitialized();
    }
    async stop() {
        for (const [userId, services] of this.activeServices) {
            logger_1.default.echo(" -- Stoping services for user: " + userId);
            const terminatePromises = [];
            for (const s of services) {
                logger_1.default.echo("  -- terminating service: " + s.name);
                await s.terminate();
                terminatePromises.push(new Promise(resolve => s.on("done", resolve)));
            }
            await Promise.all(terminatePromises);
            logger_1.default.echo("  -- All services for user: " + userId + " stopped");
        }
        logger_1.default.echo(" -- All services stopped");
    }
    registerMany(commands) {
        commands.forEach(cmd => this.register(cmd.command, cmd.handler));
    }
    register(command, handler) {
        this.callbacks.set(command.command, {
            fn: handler,
            description: command.description,
            args: command.args,
            next: command.next,
            prev: command.prev
        });
    }
    async handleCommand(command, ctx) {
        const cb = this.callbacks.get(command);
        const arg = this.getArgs(ctx.text);
        const _userId = ctx.manager?.userId;
        const userId = String(_userId);
        if (!_userId) {
            return "CommandHandler.handleCommand() No user id.";
        }
        if (!cb && !DefaultCommands.includes(command)) {
            return 'CommandHandler.handleCommand() Unknown command "' + command + '".';
        }
        const defaultCmdHandlers = [
            this.handleHelpCommand,
            this.handleSequenceCommand,
            this.handleAccountCommand,
            this.handleServiceCommand,
        ];
        for (const handler of defaultCmdHandlers) {
            const res = await handler.bind(this)(command, ctx, userId, arg);
            if (res) {
                return res;
            }
        }
        if (!cb) {
            return 'CommandHandler.handleCommand() Unknown command "' + command + '".';
        }
        try {
            if (typeof cb.fn === 'function') {
                return await cb.fn(ctx);
            }
            else if (cb.fn) {
                const serviceName = command;
                const args = this.getArgs(String(ctx.text));
                if (!this.activeServices.has(userId)) {
                    this.activeServices.set(userId, []);
                }
                if (this.activeServices.get(userId).map(serv => serv.name).includes(serviceName)) {
                    return `Service ${serviceName} already active.`;
                }
                const serviceInstance = cb.fn.clone(userId, serviceName);
                serviceInstance.on("message", async (message) => {
                    await this.sendMessageToContext(ctx, message);
                });
                serviceInstance.on('done', async (msg = "") => {
                    await this.handleServiceDone(userId, serviceInstance.name, ctx, msg);
                });
                logger_1.default.echo("-- Starting service: " + serviceInstance.name);
                const err = serviceInstance.loadInitParams(...args);
                if (err) {
                    throw `Cannot init service ${serviceName}: ${err}`;
                }
                this.activeServices.get(userId).push(serviceInstance);
                serviceInstance.run();
            }
        }
        catch (e) {
            logger_1.default.error("CommandHandler.handleCommand() Command handling error: " + e);
            return String(e);
        }
    }
    removeService(userId, serviceName) {
        const services = this.activeServices.get(userId);
        if (!services) {
            logger_1.default.error("CommandHandler.removeService() No active services for user: " + userId);
            return;
        }
        services.splice(services.map(serv => serv.name).indexOf(serviceName), 1);
    }
    async handleServiceDone(userId, serviceName, ctx, msg) {
        logger_1.default.echo("-- Service done: " + serviceName);
        this.removeService(userId, serviceName);
        await this.sendMessageToContext(ctx, `Service ${serviceName} done. ${msg}`.trim());
    }
    async sendMessageToContext(ctx, message) {
        if (ctx.reply) {
            await ctx.reply(message);
        }
        else {
            logger_1.default.error(`No reply function in context. Unhandled message: "${message}"`);
        }
    }
    getArgs(text) {
        const splited = text.trim().split(" ");
        return splited.slice(1);
    }
    mapHandlersToCommands() {
        let cmd = Array.from(this.callbacks.keys());
        const desc = Array.from(Array.from(this.callbacks.values()).map(v => v.description));
        const args = Array.from(Array.from(this.callbacks.values()).map(v => v.args));
        const mapped = new Array(cmd.length)
            .fill(0)
            .map((_, i) => ({ command: cmd[i], description: desc[i], args: args[i] }))
            .concat([
            {
                command: command_1.DefaultSeqCommandsEnum.NEXT_COMMAND,
                description: "Proceed in current command sequnce.",
                args: []
            },
            {
                command: command_1.DefaultSeqCommandsEnum.BACK_COMMAND,
                description: "Go back in current command sequnce.",
                args: []
            },
            {
                command: command_1.DefaultSeqCommandsEnum.CANCEL_COMMAND,
                description: "Cancel current command sequnce.",
                args: []
            }
        ])
            .concat([
            {
                command: command_1.DefaultServiceCommandsEnum.STOP_COMMAND,
                description: "Stop service with passed name <service-name>.",
                args: ["service-name"]
            }
        ])
            .concat([
            {
                command: command_1.DefaultAccountCommandsEnum.SET_VARIABLE,
                description: "Create or update variable for user execution context",
                args: ["service", "path", "value"]
            },
            {
                command: command_1.DefaultAccountCommandsEnum.REMOVE_VARIABLE,
                description: "Remove variable for user execution context",
                args: ["service", "path"]
            },
            {
                command: command_1.DefaultAccountCommandsEnum.GET_VARIABLE,
                description: "Get variable for user execution context",
                args: ["service", "path"]
            }
        ])
            .concat([
            {
                command: command_1.DefaultHelpCommandsEnum.HELP_COMMAND,
                description: "List all available commands.",
                args: []
            },
            {
                command: command_1.DefaultHelpCommandsEnum.CHELP_COMMAND,
                description: "Print help for concreet command",
                args: ["command"]
            }
        ]);
        return mapped;
    }
    createCommandSequenceGraph() {
        return null;
    }
    async handleHelpCommand(command, _, __, arg) {
        switch (command) {
            case command_1.DefaultHelpCommandsEnum.HELP_COMMAND:
                return this.mapHandlersToCommands().map(v => `Command: ${v.command},\n\
Description: ${v.description},\n\
Args: ${v.args?.join(", ")}\n\
`).join("\n");
            case command_1.DefaultHelpCommandsEnum.CHELP_COMMAND:
                const cmd = this.callbacks.get(arg[0]);
                if (!cmd) {
                    return `Command ${arg[0]} not found`;
                }
                if (cmd.fn instanceof Function) {
                    return `Command ${arg[0]},\n\
Description: ${cmd.description},\n\
Args: ${cmd.args?.join(", ")}\n\
Next: ${cmd.next?.join(", ") ?? "None"}\n\
Prev: ${cmd.prev ?? "None"}\
`;
                }
                else {
                    return `Service ${arg[0]},\n
Description: ${cmd.description},\n
Config: ${JSON.stringify(cmd.fn.configEntries(), null, 4)},\n
Next: ${cmd.next?.join(", ") ?? "None"}\n\
Prev: ${cmd.prev ?? "None"}\n\
`;
                }
        }
        return null;
    }
    async handleAccountCommand(command, ctx, _, arg) {
        const account = await db_1.Account.findById(ctx.manager.account);
        if (!account) {
            return "Account not found.";
        }
        switch (command) {
            case command_1.DefaultAccountCommandsEnum.SET_VARIABLE:
                await account.setModuleData(arg[0], arg[1], arg[2]);
                return "Variable setted. Current data for context:\n" + JSON.stringify(account.modules.find(m => m.module === arg[0]), null, 4);
            case command_1.DefaultAccountCommandsEnum.REMOVE_VARIABLE:
                await account.unsetModuleData(arg[0], arg[1]);
                return "Variable unsetted";
            case command_1.DefaultAccountCommandsEnum.GET_VARIABLE:
                return JSON.stringify(await account.getModuleData(arg[0], arg[1]), null, 4);
        }
        return null;
    }
    handleSequenceCommand(command, _, userId, __) {
        let seq_exe_error;
        try {
            seq_exe_error = this.sequenceHandler.handle(userId, command);
        }
        catch (e) {
            logger_1.default.error(`CommandHandler.handleCommand() Sequence handling error: ` + e);
            seq_exe_error = e;
        }
        if (seq_exe_error) {
            return seq_exe_error;
        }
        return null;
    }
    async handleServiceCommand(command, _, userId, arg) {
        if (command === command_1.DefaultServiceCommandsEnum.STOP_COMMAND) {
            if (arg.length == 0) {
                return "No service name passed";
            }
            const serviceName = arg[0];
            const userServices = this.activeServices.get(userId);
            const userServicesNames = userServices.map(s => s.name);
            if (userServicesNames.includes(serviceName)) {
                await userServices.find(serv => serv.name === serviceName).terminate();
                userServices.splice(userServicesNames.indexOf(serviceName), 1);
                return `Service "${serviceName}" stopped.`;
            }
            else {
                return `Service ${serviceName} not active.`;
            }
        }
        return null;
    }
}
exports.CommandHandler = CommandHandler;

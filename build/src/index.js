"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cmdhub_1 = require("@core/cmdhub");
const command_handler_1 = require("@core/command-handler");
const logger_1 = __importDefault(require("@utils/logger"));
const impl_registry_setup_1 = require("./impl-registry-setup");
const user_commands_1 = require("./user-commands");
async function bootstrap() {
    (0, impl_registry_setup_1.ImplRegistrySetup)();
    let handler = new command_handler_1.CommandHandler();
    handler.registerMany((0, user_commands_1.InitializeUserCommands)());
    handler.done();
    const app = new cmdhub_1.AppCmdhub("telegram", handler);
    app.setErrorInterceptor(function (error) {
        logger_1.default.error(`Internal error: ${error}`);
    });
    await app.Initialize();
    app.run();
}
bootstrap();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailableUIsEnum = void 0;
exports.mapCommands = mapCommands;
function mapCommands(commands) {
    return commands.map(cmd => ({
        command: cmd.command,
        description: cmd.description
    }));
}
var AvailableUIsEnum;
(function (AvailableUIsEnum) {
    AvailableUIsEnum["Telegram"] = "telegram";
    AvailableUIsEnum["CLI"] = "cli";
})(AvailableUIsEnum || (exports.AvailableUIsEnum = AvailableUIsEnum = {}));

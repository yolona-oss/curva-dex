"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const fs_tools_1 = require("./fs-tools");
function logTime() {
    return '[' + new Date().toLocaleString("ru").replace(', ', ' ') + ']';
}
(0, fs_tools_1.createDirIfNotExist)("./.log");
const logFileName = "./.log/" +
    new Date()
        .toLocaleDateString("ru") +
    "_" +
    new Date()
        .toLocaleTimeString("ru");
let log = function (...arg) {
    try {
        (0, fs_1.appendFileSync)(logFileName, logTime() + ' - ' + arg.join(" ") + "\n");
    }
    catch (e) {
        console.error(e);
    }
};
log.error = function (...arg) {
    log("ERROR:", ...arg);
    console.error(logTime() + ':' + '[' + chalk_1.default.red('EE') + '] ->', ...arg);
};
log.warn = function (...arg) {
    log("WARNING:", ...arg);
    console.warn(logTime() + ':' + '[' + chalk_1.default.yellow('WW') + '] ->', ...arg);
};
log.echo = function (...arg) {
    log(...arg);
    console.log(logTime() + ':' + '[' + chalk_1.default.blue('II') + '] ->', ...arg);
};
log.lineSep = function (symbol = '~', color = "cyan") {
    const cols = process.stdout.columns;
    let color_fn = chalk_1.default.cyan;
    switch (color) {
        case "red":
            color_fn = chalk_1.default.red;
            break;
        case "yellow":
            color_fn = chalk_1.default.yellow;
            break;
        case "green":
            color_fn = chalk_1.default.green;
            break;
        case "cyan":
            color_fn = chalk_1.default.cyan;
            break;
        default:
            color_fn = chalk_1.default.cyan;
            break;
    }
    console.log(chalk_1.default.bold(color_fn((symbol.slice(0, 1)).repeat(cols))));
};
exports.default = log;

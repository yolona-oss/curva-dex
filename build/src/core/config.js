"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigIfNotExists = createConfigIfNotExists;
exports.updateConfig = updateConfig;
exports.getConfig = getConfig;
exports.getInitialConfig = getInitialConfig;
const fs = __importStar(require("fs"));
const superstruct_1 = require("superstruct");
const fs_1 = require("fs");
const logger_1 = __importDefault(require("@utils/logger"));
const path_1 = require("@core/constants/path");
const path_2 = __importDefault(require("path"));
const async_lock_1 = __importDefault(require("async-lock"));
const readline = __importStar(require("readline"));
const lock = new async_lock_1.default();
function writeConfig(newConfig) {
    fs.writeFileSync(path_1.main_config_path, JSON.stringify(newConfig, null, " ".repeat(4)));
}
function parseConfig() {
    let config;
    try {
        config = JSON.parse((0, fs_1.readFileSync)(path_1.main_config_path).toString());
    }
    catch (e) {
        throw new Error("Config parse error: " + e);
    }
    (0, superstruct_1.assert)(config, ConfigSign);
    return config;
}
const ConfigSign = (0, superstruct_1.object)({
    bot: (0, superstruct_1.object)({
        token: (0, superstruct_1.pattern)((0, superstruct_1.string)(), /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/),
        admin_id: (0, superstruct_1.number)(),
        name: (0, superstruct_1.string)(),
    }),
    server: (0, superstruct_1.object)({
        ngrok: (0, superstruct_1.object)({
            authtoken: (0, superstruct_1.string)()
        }),
        database: (0, superstruct_1.object)({
            mongoose: (0, superstruct_1.object)({
                connectionUri: (0, superstruct_1.string)(),
                connectionOptions: (0, superstruct_1.object)(),
            }),
            path: (0, superstruct_1.string)(),
        }),
        fileStorage: (0, superstruct_1.object)({
            path: (0, superstruct_1.string)(),
        }),
        port: (0, superstruct_1.min)((0, superstruct_1.number)(), 1000),
        uri: (0, superstruct_1.string)(),
    }),
    log_level: (0, superstruct_1.string)(),
});
const EMPTY_CONFIG = {
    bot: {
        token: "",
        admin_id: 0,
        name: "Barebuh"
    },
    server: {
        ngrok: {
            authtoken: ""
        },
        database: {
            mongoose: {
                connectionUri: "mongodb://localhost:27017/",
                connectionOptions: {
                    dbName: "cmd-deploy-hub-v1"
                }
            },
            path: "./storage",
        },
        fileStorage: {
            path: path_2.default.join("storage", "files"),
        },
        port: 7999,
        uri: 'http://localhost:7999',
    },
    log_level: "trace",
};
async function createConfigIfNotExists() {
    if (!fs.existsSync(path_1.main_config_path)) {
        logger_1.default.echo("Creating config with default params");
        function askPrompt(question, validator = () => true, defaultValue) {
            return new Promise((resolve) => {
                rl.question(question, (answer) => {
                    const isAnswerEmpty = answer.trim().length === 0;
                    const isAnswerValid = validator(answer);
                    const isDefaultValid = defaultValue ? validator(String(defaultValue)) : true;
                    if (isAnswerEmpty || !isAnswerValid) {
                        if (defaultValue && (isDefaultValid || defaultValue === "")) {
                            resolve(defaultValue);
                        }
                        else {
                            console.log("Invalid input. Please try again.");
                            resolve(askPrompt(question, validator, defaultValue));
                        }
                    }
                    else {
                        let ret;
                        if (typeof defaultValue === "string") {
                            ret = answer;
                        }
                        else {
                            ret = Number(answer);
                        }
                        resolve(ret);
                    }
                });
            });
        }
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const skip = await askPrompt("Skip manual config creationg and set to defaults? (y/N) ", (v) => Boolean(v.match(/^[yYnN]{1}$/)), "n");
        if (skip.toLowerCase() === "y") {
            console.log("Creating default empty config");
            writeConfig(EMPTY_CONFIG);
            rl.close();
        }
        console.log("Creating manual config");
        const path_validator = (v) => Boolean(v.match(/^(?:[A-Za-z]:)?(?:\/{0,2}[^<>"\\|:;*?*]+)+$/));
        const bot_token = await askPrompt("Bot api token: ", (v) => Boolean(v.match(/^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/)), "null");
        const admin_id = await askPrompt("Admin id: ", (v) => Boolean(v.match(/^[0-9]{9}$/)), -1);
        const bot_name = await askPrompt("Bot name: ", () => true, "cmd_deploy_hub_bot");
        const ngrok_token = await askPrompt("Ngrok authtoken: ", (v) => Boolean(v.match(/^[0-9A-Za-z]{48}$/)), "");
        const mongodb_uri = await askPrompt("Mongodb uri: ", (v) => Boolean(v.match(/^mongodb:\/\/.+:[0-9]+/)), "mongodb://localhost:27017");
        const mongodb_name = await askPrompt("Mongodb name: ", () => true, "cmd-deploy-hub-v1");
        const storage_path = await askPrompt("Storage path: ", path_validator, path_2.default.join("app-data", "cmd-deploy-hub"));
        const public_storage_path = await askPrompt("Public storage path: ", path_validator, path_2.default.join(storage_path, "static"));
        const server_uri = await askPrompt("Server uri: ", (v) => Boolean(v.match(/^http(s)?:\/\/.+:[0-9]+/)), "http://localhost");
        const server_port = await askPrompt("Port: ", (v) => Boolean(v.match(/^[0-9]{4,5}$/)), 7999);
        const log_level = await askPrompt("Log level: ", (v) => Boolean(v.match(/^(trace|debug|info|warn|error)$/)), "trace");
        const user_config = {
            bot: {
                token: bot_token,
                admin_id,
                name: bot_name
            },
            server: {
                ngrok: {
                    authtoken: ngrok_token
                },
                database: {
                    mongoose: {
                        connectionUri: mongodb_uri,
                        connectionOptions: {
                            dbName: mongodb_name
                        }
                    },
                    path: storage_path,
                },
                fileStorage: {
                    path: public_storage_path,
                },
                port: server_port,
                uri: server_uri,
            },
            log_level,
        };
        writeConfig(user_config);
        rl.close();
    }
}
async function loadConfig() {
    return await lock.acquire('config', async () => {
        return parseConfig();
    });
}
function updateConfig(newConfig) {
    return lock.acquire('config', async () => {
        let updatingConfig = loadConfig();
        updatingConfig = { ...updatingConfig, ...newConfig };
        (0, superstruct_1.assert)(updatingConfig, ConfigSign);
        writeConfig(updatingConfig);
    });
}
let configPromise = loadConfig();
async function getConfig() {
    return await configPromise;
}
function getInitialConfig() {
    return parseConfig();
}

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
exports.loadFromJson = loadFromJson;
exports.writeJsonData = writeJsonData;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("@utils/logger"));
const config_1 = require("@core/config");
const cfg = (0, config_1.getInitialConfig)();
function loadFromJson(dir_name, file_name) {
    const dir = path_1.default.join(cfg.server.fileStorage.path, dir_name);
    const dst_path = path_1.default.join(dir, `${file_name}.json`);
    if (fs.existsSync(dir)) {
        if (fs.existsSync(dst_path)) {
            try {
                const data = fs.readFileSync(dst_path, 'utf8');
                return JSON.parse(data);
            }
            catch (e) {
                logger_1.default.error(`loadFromJson() error: ${e}.\nMaybe file empty or json syntax error.`);
                return null;
            }
        }
    }
    return null;
}
function writeJsonData(dir, file_name, data) {
    const save_dir = path_1.default.join(cfg.server.fileStorage.path, ...dir);
    const save_file = path_1.default.join(save_dir, `${file_name}.json`);
    try {
        if (!fs.existsSync(save_dir)) {
            fs.mkdirSync(save_dir, { recursive: true });
        }
    }
    catch (e) {
        logger_1.default.error("Error creating save dir:", e);
        return false;
    }
    try {
        fs.writeFileSync(save_file, JSON.stringify(data, null, 4));
    }
    catch (e) {
        logger_1.default.error(`Error saving JSON: ${e}`);
        return false;
    }
    return true;
}

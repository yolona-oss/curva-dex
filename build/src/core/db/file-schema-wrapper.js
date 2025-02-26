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
exports.FilesWrapper = void 0;
const db_1 = require("@core/db");
const config_1 = require("@core/config");
const random_1 = require("@utils/random");
const logger_1 = __importDefault(require("@utils/logger"));
const mime = __importStar(require("mime-types"));
const download_1 = __importDefault(require("download"));
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const tmpDb = './index.json';
const defaultAvatarName = "default-avatar";
const defaults = [
    {
        name: defaultAvatarName,
        path: "static/manager-icon.png",
    }
];
class Files {
    static defaultsInited = false;
    constructor() {
        this.copyDefaults();
    }
    async checkDefaults() {
        const createDefault = async (name, path) => {
            const m_doc = await db_1.File.create({
                mime: "image/png",
                path,
                group: "static",
            });
            this.appendTmpDB({
                name,
                id: m_doc.id
            });
        };
        const cfg = (0, config_1.getInitialConfig)();
        const tmpDb = this.parseTmpDB();
        for (const def of defaults) {
            const entry = tmpDb.find(d => d.name === def.name);
            if (!entry) {
                await createDefault(def.name, path_1.default.join(cfg.server.fileStorage.path, def.path));
            }
        }
    }
    copyDefaults() {
        const cfg = (0, config_1.getInitialConfig)();
        try {
            const ico_path = path_1.default.join(cfg.server.fileStorage.path, "static", "manager-icon.png");
            const ico_static_path = path_1.default.join("assets", "manager-icon.png");
            if (!fs.existsSync(ico_path)) {
                logger_1.default.echo("Files::constructor() copying default manager icon...");
                if (!fs.existsSync(path_1.default.dirname(ico_path))) {
                    logger_1.default.echo("Files::copyDefaults() creating default manager icon directory...");
                    fs.mkdirSync(path_1.default.dirname(ico_path), { recursive: true });
                }
                fs.copyFileSync(ico_static_path, ico_path);
            }
        }
        catch (e) {
            throw new Error(`Files::constructor() cannot copy default manager icon! ${JSON.stringify(e, null, 4)} ${e}`);
        }
    }
    parseTmpDB() {
        let obj;
        try {
            obj = JSON.parse(fs.readFileSync(tmpDb).toString());
        }
        finally {
            return obj ?? [];
        }
    }
    appendTmpDB(d) {
        let current = this.parseTmpDB();
        current.push(d);
        fs.writeFileSync(tmpDb, JSON.stringify(current, null, 4));
    }
    async getFile(id) {
        return await db_1.File.findById(id);
    }
    async getFileByName(name) {
        return await db_1.File.findOne({ path: name });
    }
    async saveFile(url, group) {
        const cfg = await (0, config_1.getConfig)();
        const _mime = mime.lookup(url);
        const ext = _mime ? mime.extension(_mime) : null;
        const sufix = (ext ? "." + ext : "");
        const filename = (0, random_1.genRandomString)(10) + sufix;
        const path = cfg.server.fileStorage.path + '/' + filename;
        let res = await (0, download_1.default)(url, cfg.server.fileStorage.path, { filename: filename });
        let schema = {
            mime: mime.lookup(path) || "unknown",
            path: path,
            group: group
        };
        if (res) {
            return await db_1.File.create(schema);
        }
        else {
            return null;
        }
    }
    async getDefault(name) {
        if (!Files.defaultsInited) {
            await this.checkDefaults();
            Files.defaultsInited = true;
        }
        const entry = this.parseTmpDB().find(f => f.name === name);
        if (!entry) {
            throw new Error("Files::getDefault() cannot find default file!");
        }
        return await this.getFile(entry.id);
    }
    async getDefaultAvatar() {
        return await this.getDefault(defaultAvatarName);
    }
}
exports.FilesWrapper = new Files();

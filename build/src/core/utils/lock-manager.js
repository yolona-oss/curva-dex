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
exports.LockManager = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
class LockManager {
    lockDir;
    lockFiles = new Set();
    static createLockFileName(hash) {
        return `${hash}.lock`;
    }
    constructor(lockDir) {
        this.lockDir = lockDir;
        try {
            fs.accessSync(path_1.default.dirname(lockDir), fs.constants.W_OK);
        }
        catch (e) {
            console.log(e);
            throw new Error(`Directory ${lockDir} not writable for user "${process.env.USER || "Unknown User"}"`);
        }
        if (!fs.existsSync(lockDir)) {
            fs.mkdirSync(lockDir, { recursive: true });
        }
    }
    createLockFile(hash, data = '') {
        try {
            const filePath = path_1.default.join(this.lockDir, LockManager.createLockFileName(hash));
            fs.writeFileSync(filePath, data, { flag: "wx+", encoding: 'utf-8' });
            this.lockFiles.add(filePath);
            return filePath;
        }
        catch (e) {
            if (e.code === 'EEXIST') {
                return null;
            }
            else {
                throw e;
            }
        }
    }
    getLockFileData(hash) {
        try {
            const filePath = path_1.default.join(this.lockDir, LockManager.createLockFileName(hash));
            return fs.readFileSync(filePath, { encoding: 'utf-8' });
        }
        catch (e) {
            return null;
        }
    }
    deleteLockFile(filePath) {
        if (this.lockFiles.has(filePath)) {
            fs.unlinkSync(filePath);
            this.lockFiles.delete(filePath);
            return true;
        }
        return false;
    }
    cleanupAll() {
        let unlinked = 0;
        for (const filePath of this.lockFiles) {
            try {
                fs.unlinkSync(filePath);
                unlinked++;
            }
            catch (err) {
                console.error(`Failed to delete lock file ${filePath}:`, err);
            }
        }
        this.lockFiles.clear();
        return unlinked;
    }
}
exports.LockManager = LockManager;

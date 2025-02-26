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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerSchema = void 0;
const db_1 = require("@core/db");
const models_enum_1 = require("@core/db/models-enum");
const mongoose_1 = __importStar(require("mongoose"));
exports.ManagerSchema = new mongoose_1.Schema({
    userId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    isAdmin: { type: Boolean, required: false, default: false },
    online: { type: Boolean, required: false, default: false },
    avatar: { type: mongoose_1.default.Schema.Types.ObjectId, ref: models_enum_1.DbModelsEnum.Files, default: null },
    useGreeting: { type: Boolean, required: false, default: true },
    account: { type: mongoose_1.default.Schema.Types.ObjectId, ref: models_enum_1.DbModelsEnum.Accounts, default: null },
});
exports.ManagerSchema.pre('save', async function (next) {
    try {
        if (!this.avatar) {
            this.avatar = (await db_1.FilesWrapper.getDefaultAvatar()).id;
        }
        if (!this.account) {
            this.account = (await db_1.Account.create({ modules: [] })).id;
        }
    }
    catch (e) {
        next(e);
    }
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = exports.FilesWrapper = exports.File = exports.Manager = exports.MongoConnect = void 0;
var mongoose_1 = require("./mongoose");
Object.defineProperty(exports, "MongoConnect", { enumerable: true, get: function () { return mongoose_1.MongoConnect; } });
const mongoose_2 = __importDefault(require("mongoose"));
const schemes_1 = require("./schemes");
const models_enum_1 = require("./models-enum");
exports.Manager = mongoose_2.default.model(models_enum_1.DbModelsEnum.Managers, schemes_1.ManagerSchema);
exports.File = mongoose_2.default.model(models_enum_1.DbModelsEnum.Files, schemes_1.FileSchema);
var file_schema_wrapper_1 = require("./file-schema-wrapper");
Object.defineProperty(exports, "FilesWrapper", { enumerable: true, get: function () { return file_schema_wrapper_1.FilesWrapper; } });
exports.Account = mongoose_2.default.model(models_enum_1.DbModelsEnum.Accounts, schemes_1.AccountSchema);

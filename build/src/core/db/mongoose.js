"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoConnect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("@utils/logger"));
const MongoConnect = async (uri, options) => {
    try {
        logger_1.default.echo("Connecting to mongoose...");
        await mongoose_1.default.connect(uri, options);
        logger_1.default.echo("DB connected.");
    }
    catch (error) {
        logger_1.default.error('Error connecting to MongoDB: ', error);
        process.exit(1);
    }
};
exports.MongoConnect = MongoConnect;

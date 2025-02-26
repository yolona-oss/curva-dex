"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSchema = void 0;
const mongoose_1 = require("mongoose");
exports.FileSchema = new mongoose_1.Schema({
    mime: { type: String, required: true },
    path: { type: String, required: true },
    group: { type: String, required: true },
});

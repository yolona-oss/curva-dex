"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonStrip = jsonStrip;
function jsonStrip(s) {
    return s.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
}

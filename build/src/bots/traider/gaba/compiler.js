"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GabaCompier = void 0;
class GabaScriptReader {
    constructor() {
    }
    seek() {
    }
    read() {
    }
}
class GabaCompier {
    script;
    reader;
    constructor(script) {
        this.script = script;
        this.reader = new GabaScriptReader();
    }
    readline() {
    }
    compile() {
    }
}
exports.GabaCompier = GabaCompier;

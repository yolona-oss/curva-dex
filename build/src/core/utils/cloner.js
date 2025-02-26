"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cloner = void 0;
class Cloner {
    value;
    constructor(value) {
        this.value = value;
    }
    clone() {
        if (typeof this.value === "object" && this.value !== null) {
            return JSON.parse(JSON.stringify(this.value));
        }
        return this.value;
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        this.value = value;
    }
}
exports.Cloner = Cloner;

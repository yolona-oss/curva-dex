"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDefaults = mergeDefaults;
function mergeDefaults(obj, defaults) {
    return { ...defaults, ...obj };
}

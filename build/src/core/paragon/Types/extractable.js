"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractableSign = exports.extractableObjSign = void 0;
exports.extract = extract;
const superstruct_1 = require("superstruct");
const AllowedExtractionSources = [
    "Profile",
    "Mail",
    "URL",
    "Page",
    "JSON_API",
    "ElementAttr"
];
exports.extractableObjSign = (0, superstruct_1.object)({
    source: (0, superstruct_1.enums)(AllowedExtractionSources),
    path: (0, superstruct_1.array)((0, superstruct_1.string)()),
    append: (0, superstruct_1.optional)((0, superstruct_1.string)()),
    prepend: (0, superstruct_1.optional)((0, superstruct_1.string)()),
});
exports.extractableSign = (0, superstruct_1.union)([
    (0, superstruct_1.string)(),
    exports.extractableObjSign
]);
async function extract(extractable) {
    let ret;
    if (typeof extractable === "object") {
        throw "Unknown extractable " + typeof extractable;
    }
    else if (typeof extractable === "string") {
        ret = extractable;
    }
    else {
        throw "Unknown extractable " + typeof extractable;
    }
    return ret;
}

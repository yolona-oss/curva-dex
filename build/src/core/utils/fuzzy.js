"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuzzyMatchMap = fuzzyMatchMap;
exports.fuzzyMatchMapSimple = fuzzyMatchMapSimple;
const fuzzy_1 = __importDefault(require("fuzzy"));
function fuzzyMatchMap(s) {
    let ret = false;
    s.forEach(e => {
        const match = fuzzy_1.default.match(e.search, e.input, { caseSensitive: false });
        if (match && match.score > e.minScore) {
            ret = true;
        }
    });
    return ret;
}
function fuzzyMatchMapSimple(search, input, minScore = 50) {
    return fuzzyMatchMap(search.map(e => { return { search: e, input: input, minScore: minScore }; }));
}

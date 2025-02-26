"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intersect = intersect;
exports.difference = difference;
exports.union = union;
exports.unique = unique;
exports.isUnique = isUnique;
function intersect(a, b) {
    return a.filter(x => b.includes(x));
}
function difference(a, b) {
    return a.filter(x => !b.includes(x));
}
function union(a, b) {
    return [...a, ...b];
}
function unique(a) {
    return [...new Set(a)];
}
function isUnique(a) {
    return a.length === unique(a).length;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exTimeRangeToMilliseconds = exTimeRangeToMilliseconds;
exports.isExDateInRange = isExDateInRange;
exports.isExDateOutOfRange = isExDateOutOfRange;
function exTimeRangeToMilliseconds(range) {
    if (range.match(/m$/)) {
        return Number(range.replace(/m$/, "")) * 60 * 1000;
    }
    if (range.match(/h$/)) {
        return Number(range.replace(/h$/, "")) * 60 * 60 * 1000;
    }
    if (range.match(/d$/)) {
        return Number(range.replace(/d$/, "")) * 24 * 60 * 60 * 1000;
    }
    if (range.match(/w$/)) {
        return Number(range.replace(/w$/, "")) * 7 * 24 * 60 * 60 * 1000;
    }
    if (range.match(/mon$/)) {
        return Number(range.replace(/mon$/, "")) * 30 * 24 * 60 * 60 * 1000;
    }
    return -1;
}
function isExDateInRange(start, end, range) {
    const diff = end - start;
    const rDiff = exTimeRangeToMilliseconds(range);
    return diff <= rDiff;
}
function isExDateOutOfRange(start, end, range) {
    const diff = end - start;
    const rDiff = exTimeRangeToMilliseconds(range);
    return diff > rDiff;
}

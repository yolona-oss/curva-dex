"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elapsedExec = elapsedExec;
async function elapsedExec(fn) {
    const start = performance.now();
    let res = null;
    try {
        res = await fn();
    }
    catch (e) {
        console.error(e);
        throw e;
    }
    return {
        elapsed: performance.now() - start,
        result: res
    };
}

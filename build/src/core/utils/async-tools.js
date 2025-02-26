"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeouted = timeouted;
exports.retrier = retrier;
const time_1 = require("./time");
const mergeDefaults_1 = require("./mergeDefaults");
const logger_1 = __importDefault(require("./logger"));
const retrierOptsDefaults = {
    retries: 3,
    wait: 700,
    timeout: 0
};
async function timeouted(task, timeout) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Operation timed out"));
        }, timeout);
        task()
            .then((result) => {
            clearTimeout(timer);
            resolve(result);
        })
            .catch((error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
async function retrier(fn, opts = {}) {
    let { retries, wait, timeout } = (0, mergeDefaults_1.mergeDefaults)(opts, retrierOptsDefaults);
    if (timeout <= 0) {
        logger_1.default.error("retrier::Timeout must be greater than 0. Setting to 0.");
        timeout = 0;
    }
    let iter = 0;
    const gain = 200;
    const checkFn = async () => {
        try {
            return await fn();
        }
        catch (e) {
            await (0, time_1.sleep)(wait + (iter * gain));
            iter++;
            return null;
        }
    };
    let loopFn;
    if (timeout > 0) {
        loopFn = async () => await new Promise((res) => {
            timeouted(checkFn, timeout).then((v) => {
                if (!v) {
                    res(null);
                }
                res(v);
            }).catch(() => { res(null); });
        });
    }
    else {
        loopFn = checkFn;
    }
    for (let attempts = 0; attempts < retries; attempts++) {
        const res = await loopFn();
        if (res) {
            return res;
        }
    }
    throw new Error("retrier::Unreachable action: " + fn.name);
}

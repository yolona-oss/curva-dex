"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HMSTime = void 0;
exports.sleep = sleep;
exports.timeoutPromise = timeoutPromise;
exports.randSleep = randSleep;
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function timeoutPromise(timeout) {
    return new Promise(function (_, reject) {
        setTimeout(function () {
            reject("Timeout");
        }, timeout);
    });
}
async function randSleep(max = 1000, min = 100) {
    let ms = Math.round(Math.random() * (max - min) + min);
    return await sleep(ms);
}
class HMSTime {
    hour = 0;
    minutes = 0;
    seconds = 0;
    milliseconds = 0;
    constructor(time = {}) {
        Object.assign(this, time);
    }
    static sleep(time) {
        return new Promise(resolve => setTimeout(resolve, new HMSTime(time).toMilliseconds()));
    }
    toString(format = "Y-m-d H:i:s:v") {
        let d = this.toDate();
        return format
            .replace(/Y/gm, d.getFullYear().toString())
            .replace(/m/gm, ('0' + (d.getMonth() + 1)).substr(-2))
            .replace(/d/gm, ('0' + (d.getDate() + 1)).substr(-2))
            .replace(/H/gm, ('0' + (d.getHours() + 0)).substr(-2))
            .replace(/i/gm, ('0' + (d.getMinutes() + 0)).substr(-2))
            .replace(/s/gm, ('0' + (d.getSeconds() + 0)).substr(-2))
            .replace(/v/gm, ('0000' + (d.getMilliseconds() % 1000)).substr(-3));
    }
    toJSON() {
        return {
            hour: this.hour,
            minutes: this.minutes,
            seconds: this.seconds,
            milliseconds: this.milliseconds,
        };
    }
    toMilliseconds() {
        return this.hour * 3600000 +
            this.minutes * 6000 +
            this.seconds * 1000 +
            this.milliseconds;
    }
    toSeconds() {
        return this.toMilliseconds() / 1000;
    }
    toMinutes() {
        return this.toSeconds() / 60;
    }
    toHours() {
        return this.toMinutes() / 60;
    }
    addToDate(date = new Date()) {
        let copy = new Date(date);
        return new Date(copy.setTime(copy.getTime() + this.toMilliseconds()));
    }
    substractFromDate(date = new Date()) {
        let copy = new Date(date);
        return new Date(copy.setTime(copy.getTime() - this.toMilliseconds()));
    }
    add(time) {
        this.hour += time.hour ?? 0;
        this.minutes += time.minutes ?? 0;
        this.seconds += time.seconds ?? 0;
        this.milliseconds += time.milliseconds ?? 0;
        return this;
    }
    substract(time) {
        this.add(time);
        if (this.hour < 0)
            this.hour = 0;
        if (this.minutes < 0)
            this.minutes = 0;
        if (this.seconds < 0)
            this.seconds = 0;
        if (this.milliseconds < 0)
            this.milliseconds = 0;
        return this;
    }
    addMilliseconds(milliseconds) {
        return this.add({ milliseconds });
    }
    addSeconds(seconds) {
        return this.add({ seconds });
    }
    addMinutes(minutes) {
        return this.add({ minutes });
    }
    addHours(hour) {
        return this.add({ hour });
    }
    get Hour() {
        return this.hour;
    }
    get Minutes() {
        return this.minutes;
    }
    get Seconds() {
        return this.seconds;
    }
    get Milliseconds() {
        return this.milliseconds;
    }
    toDate() {
        return new Date(this.toMilliseconds());
    }
}
exports.HMSTime = HMSTime;

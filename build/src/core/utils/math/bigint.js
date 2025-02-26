"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigIntMath = void 0;
var BigIntMath;
(function (BigIntMath) {
    function abs(x) {
        return x < 0n ? -x : x;
    }
    BigIntMath.abs = abs;
    function min(...args) {
        if (args.length < 1) {
            throw 'Min of empty list';
        }
        let m = args[0];
        args.forEach(a => { if (a < m) {
            m = a;
        } });
        return m;
    }
    BigIntMath.min = min;
    function max(...args) {
        if (args.length < 1) {
            throw 'Max of empty list';
        }
        let m = args[0];
        args.forEach(a => { if (a > m) {
            m = a;
        } });
        return m;
    }
    BigIntMath.max = max;
})(BigIntMath || (exports.BigIntMath = BigIntMath = {}));

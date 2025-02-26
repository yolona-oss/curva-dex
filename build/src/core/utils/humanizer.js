"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Humanizer = void 0;
var Humanizer;
(function (Humanizer) {
    let Postfixes;
    (function (Postfixes) {
        Postfixes.num_long = [
            "thousand",
            "million",
            "billion",
            "trillion",
            "quadrillion",
            "quintillion",
            "sextillion",
            "septillion",
            "octillion",
            "nonillion",
            "decillion",
        ];
        Postfixes.ext_short = [
            "k",
            "M",
            "G",
            "T",
            "P",
            "E",
            "Z",
            "Y",
            "Q",
            "R",
            "S",
            "O",
        ];
        Postfixes.ext_long = [
            "Kilo",
            "Mega",
            "Giga",
            "Tera",
            "Peta",
            "Exa",
            "Zetta",
            "Yotta",
            "Quetta",
            "Ronna",
            "Sexta",
            "Octa",
        ];
        Postfixes.binary_1000_short = [
            "Kib",
            "Mib",
            "Gib",
            "Tib",
            "Pib",
            "Eib",
            "Zib",
            "Yib",
            "Qib",
            "Rib",
            "Sib",
            "Oib",
        ];
        Postfixes.binary_1024_short = [
            "KB",
            "MB",
            "Gb",
            "TB",
            "PB",
            "EB",
            "ZB",
            "YB",
            "QB",
            "RB",
            "SB",
            "OB",
        ];
        Postfixes.binary_1024_long = [
            "KiloBytes",
            "MegaBytes",
            "GigaBytes",
            "TeraBytes",
            "PetaBytes",
            "ExaBytes",
            "ZettaBytes",
            "YottaBytes",
            "QuettaBytes",
            "RonnaBytes",
            "SextaBytes",
            "OctaBytes",
        ];
    })(Postfixes || (Postfixes = {}));
    const extLong = true;
    const fixed = 3;
    function Number(num) {
        const digitsToPostfix = (dig) => {
            const ind = Math.floor(dig / 3) - 1;
            if (ind < 0) {
                return "";
            }
            const SelPostfix = extLong ? Postfixes.ext_long : Postfixes.ext_short;
            if (ind < SelPostfix.length)
                return SelPostfix[ind];
            console.log("err: too many digits");
            return "";
        };
        const digits = num.toString().length;
        const postfix = digitsToPostfix(digits);
        const power = Math.floor(digits / 3) * 3;
        return `${(Number(num) / 10 ** power).toFixed(fixed)}${postfix}`;
    }
    Humanizer.Number = Number;
})(Humanizer || (exports.Humanizer = Humanizer = {}));

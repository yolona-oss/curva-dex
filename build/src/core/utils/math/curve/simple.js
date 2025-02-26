"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCurve = createCurve;
function createCurve(start, end, numPoints, easingFunction = (t) => t) {
    const curve = [];
    const x0 = start.x;
    const y0 = start.y;
    const x1 = end.x;
    const y1 = end.y;
    for (let n = 0; n <= numPoints; n++) {
        const t = n / numPoints;
        const easedT = easingFunction(t);
        const Xn = x0 + n;
        const Yn = y0 + (y1 - y0) * easedT;
        curve.push({ x: Xn, y: Yn });
    }
    return curve;
}

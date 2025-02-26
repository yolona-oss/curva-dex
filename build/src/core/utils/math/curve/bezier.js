"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bezier = void 0;
var Bezier;
(function (Bezier) {
    function linear(t, p0, p1) {
        return {
            x: p0.x + t * (p1.x - p0.x),
            y: p0.y + t * (p1.y - p0.y),
        };
    }
    Bezier.linear = linear;
    function cubic(t, p0, p1, p2, p3) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
        const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
        return { x, y };
    }
    Bezier.cubic = cubic;
    function quadratic(t, p0, p1, p2) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const x = uu * p0.x + 2 * u * t * p1.x + tt * p2.y;
        const y = uu * p0.y + 2 * u * t * p1.y + tt * p2.y;
        return { x, y };
    }
    Bezier.quadratic = quadratic;
    function composite(segments, numPoints, easingFunction = (t) => t) {
        const curve = [];
        const numSegments = segments.length;
        for (let n = 0; n <= numPoints; n++) {
            const t = n / numPoints;
            const easedT = easingFunction(t);
            const segmentIndex = Math.min(Math.floor(easedT * numSegments), numSegments - 1);
            const segmentT = (easedT * numSegments) - segmentIndex;
            const [p0, p1, p2, p3] = segments[segmentIndex];
            const pointOnCurve = cubic(segmentT, p0, p1, p2, p3);
            curve.push(pointOnCurve);
        }
        return curve;
    }
    Bezier.composite = composite;
    function any(t, points) {
        switch (points.length) {
            case 3: return quadratic(t, points[0], points[1], points[2]);
            case 4: return cubic(t, points[0], points[1], points[2], points[3]);
        }
        const n = points.length - 1;
        function factorial(n) {
            if (n === 0 || n === 1)
                return 1;
            return n * factorial(n - 1);
        }
        function binomialCoefficient(n, k) {
            return factorial(n) / (factorial(k) * factorial(n - k));
        }
        function bernsteinPolynomial(n, i, t) {
            return binomialCoefficient(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
        }
        let x = 0;
        let y = 0;
        for (let i = 0; i <= n; i++) {
            const b = bernsteinPolynomial(n, i, t);
            x += b * points[i].x;
            y += b * points[i].y;
        }
        return { x, y };
    }
    Bezier.any = any;
    function compositeAny(points, numPoint) {
        const curve = [];
        for (let n = 0; n <= numPoint; n++) {
            const t = n / numPoint;
            const pointOnCurve = any(t, points);
            curve.push(pointOnCurve);
        }
        return curve;
    }
    Bezier.compositeAny = compositeAny;
})(Bezier || (exports.Bezier = Bezier = {}));

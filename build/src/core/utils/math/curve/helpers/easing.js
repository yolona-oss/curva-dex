"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easeOutQuad = exports.easeInQuad = exports.linearEasing = void 0;
const linearEasing = (t) => t;
exports.linearEasing = linearEasing;
const easeInQuad = (t) => t * t;
exports.easeInQuad = easeInQuad;
const easeOutQuad = (t) => t * (2 - t);
exports.easeOutQuad = easeOutQuad;

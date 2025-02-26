"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
class Node {
    data;
    next = null;
    prev = null;
    constructor(data) {
        this.data = data;
    }
}
exports.Node = Node;

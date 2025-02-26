"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stack = void 0;
class Stack {
    capacity;
    storage = [];
    constructor(capacity = Infinity) {
        this.capacity = capacity;
    }
    push(item) {
        if (this.size() === this.capacity) {
            throw Error("Stack has reached max capacity, you cannot add more items");
        }
        this.storage.push(item);
    }
    pop() {
        return this.storage.pop();
    }
    peek() {
        return this.storage[this.size() - 1];
    }
    size() {
        return this.storage.length;
    }
    drop() {
        this.storage = [];
    }
    isEmpty() {
        return this.size() === 0;
    }
    includes(item) {
        return this.storage.includes(item);
    }
}
exports.Stack = Stack;

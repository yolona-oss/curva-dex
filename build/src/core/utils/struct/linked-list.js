"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedList = exports.Node = void 0;
const linked_list_1 = require("@core/types/linked-list");
Object.defineProperty(exports, "Node", { enumerable: true, get: function () { return linked_list_1.Node; } });
class LinkedList {
    head = null;
    insertInBegin(data) {
        const node = new linked_list_1.Node(data);
        if (!this.head) {
            this.head = node;
        }
        else {
            this.head.prev = node;
            node.next = this.head;
            this.head = node;
        }
        return node;
    }
    insertAtEnd(data) {
        const node = new linked_list_1.Node(data);
        if (!this.head) {
            this.head = node;
        }
        else {
            const getLast = (node) => {
                return node.next ? getLast(node.next) : node;
            };
            const lastNode = getLast(this.head);
            node.prev = lastNode;
            lastNode.next = node;
        }
        return node;
    }
    deleteNode(node) {
        if (!node.prev) {
            this.head = node.next;
        }
        else {
            const prevNode = node.prev;
            prevNode.next = node.next;
        }
    }
    traverse() {
        const array = [];
        if (!this.head) {
            return array;
        }
        const addToArray = (node) => {
            array.push(node.data);
            return node.next ? addToArray(node.next) : array;
        };
        return addToArray(this.head);
    }
    size() {
        return this.traverse().length;
    }
    getLast(cur_head) {
        return cur_head.next ? this.getLast(cur_head.next) : cur_head;
    }
    ;
    search(comparator) {
        const checkNext = (node) => {
            if (comparator(node.data)) {
                return node;
            }
            return node.next ? checkNext(node.next) : null;
        };
        return this.head ? checkNext(this.head) : null;
    }
}
exports.LinkedList = LinkedList;

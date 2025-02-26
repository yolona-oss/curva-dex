"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graph = exports.Node = void 0;
exports.bfs = bfs;
exports.printGraph = printGraph;
class Node {
    value;
    neighbors;
    constructor(value) {
        this.value = value;
        this.neighbors = [];
    }
    addNeighbor(node) {
        this.neighbors.push(node);
    }
}
exports.Node = Node;
class Graph {
    nodes;
    constructor() {
        this.nodes = [];
    }
    addNode(value) {
        const node = new Node(value);
        this.nodes.push(node);
    }
    addEdge(source, destination) {
        source.addNeighbor(destination);
        destination.addNeighbor(source);
    }
}
exports.Graph = Graph;
function bfs(startNode) {
    const visited = new Set();
    const queue = [];
    visited.add(startNode);
    queue.push(startNode);
    while (queue.length > 0) {
        const currentNode = queue.shift();
        console.log(currentNode.value);
        for (const neighbor of currentNode.neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
}
function printGraph(graph) {
    console.log('Graph:');
    graph.nodes.forEach(node => {
        console.log(`Node: ${node.value.description}`);
        console.log('Neighbors:');
        node.neighbors.forEach(neighbor => {
            console.log(`  - ${neighbor.value.description}`);
        });
        console.log('');
    });
}

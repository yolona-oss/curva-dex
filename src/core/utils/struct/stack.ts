import { IStack } from "@core/types/stack"
export type { IStack }

export class Stack<T> implements IStack<T> {
    private storage: T[] = [];

    constructor(private capacity: number = Infinity) {}

    push(...items: T[]): void {
        if (this.size() + items.length >= this.capacity) {
            throw Error("Stack has reached max capacity, you cannot add more items");
        }
        
        this.storage.push(...items);
    }

    pop(): T | undefined {
        return this.storage.pop();
    }

    peek(): T | undefined {
        return this.storage[this.size() - 1];
    }

    size(): number {
        return this.storage.length;
    }

    drop(): void {
        this.storage = [];
    }

    isEmpty(): boolean {
        return this.size() === 0;
    }

    includes(item: T): boolean {
        return this.storage.includes(item);
    }

    reverse(): T[] {
        return this.storage.reverse();
    }
}

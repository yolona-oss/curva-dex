export function intersect<T>(a: T[], b: T[]): T[] {
    return a.filter(x => b.includes(x));
}

export function difference<T>(a: T[], b: T[]): T[] {
    return a.filter(x => !b.includes(x));
}

export function union<T>(a: T[], b: T[]): T[] {
    return [...a, ...b];
}

export function unique<T>(a: T[]): T[] {
    return [...new Set(a)];
}

export function isUnique<T>(a: T[]): boolean {
    return a.length === unique(a).length;
}

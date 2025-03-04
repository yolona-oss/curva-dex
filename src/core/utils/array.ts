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

export function isEqual<T>(a: T[], b: T[]): boolean {
    return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
}

export function shuffle<T>(array: T[]) { 
    for (let i = array.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]]; 
    }
    return array; 
}; 

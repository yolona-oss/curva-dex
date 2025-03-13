export type ReduceToNumber<T extends number | bigint> = T extends number ? T : number;

export namespace BigIntMath {
    export function abs(x: bigint): bigint {
        return x < 0n ? -x : x;
    }

    export function min(...args: bigint[]){
        if (args.length < 1){ throw 'Min of empty list'; }
        let m = args[0];
        args.forEach(a=>{if (a < m) {m = a}});
        return m;
    }

    export function max(...args: bigint[]){
        if (args.length < 1){ throw 'Max of empty list'; }
        let m = args[0];
        args.forEach(a=>{if (a > m) {m = a}});
        return m;
    }
}

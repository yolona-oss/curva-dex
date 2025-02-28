import { Stack } from "./struct/stack";

export type OptsMap = Record<string, Object | null>;

export const Opt = {
    String: '',
    Bool: true,
    Number: 0,
    None: null
}

export type InferParsedOpts<T extends OptsMap> = {
    [K in keyof T]: T[K] extends StringConstructor ? string
        : T[K] extends NumberConstructor ? number
        : T[K] extends BooleanConstructor ? boolean
        : T[K] extends null ? true
        : never;
};

export function optsParser<T extends OptsMap>(
    input: string[],
    optsMap: T
) {
    const opts = new Stack<string>(input.length);
    opts.push(...input);
    opts.reverse();

    const ret: Partial<InferParsedOpts<T>> = {};

    while (opts.size() > 0) {
        const opt = opts.pop();
        if (opt && opt in optsMap) {
            const v = optsMap[opt];

            if (v === null) {
                ret[opt as keyof T] = true as InferParsedOpts<T>[keyof T];
                continue;
            }

            const val = opts.pop();
            if (!val || val in optsMap) {
                throw new Error(`Missing value for option: ${opt}`);
            }

            if (v === String) {
                ret[opt as keyof T] = val as InferParsedOpts<T>[keyof T];
            } else if (v === Number) {
                const toNum = Number(val);
                if (isNaN(toNum)) {
                    throw new Error(`Invalid number for option: ${opt}`);
                }
                ret[opt as keyof T] = toNum as InferParsedOpts<T>[keyof T];
            } else if (v === Boolean) {
                if (val === 'true') {
                    ret[opt as keyof T] = true as InferParsedOpts<T>[keyof T];
                } else if (val === 'false') {
                    ret[opt as keyof T] = false as InferParsedOpts<T>[keyof T];
                } else {
                    throw new Error(`Invalid boolean for option: ${opt}`);
                }
            } else {
                throw new Error(`Unsupported type for option: ${opt}`);
            }
        }
    }

    return ret
}

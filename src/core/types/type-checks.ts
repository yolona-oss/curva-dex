export type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>> 
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?:
            Required<Pick<T, K>>
            & Partial<Record<Exclude<Keys, K>, undefined>>
    }[Keys];

export type WithDefaultField<T, Keys extends keyof T, DefaultKey extends Keys> =
    | RequireOnlyOne<T, Keys>
    | (Pick<T, Exclude<keyof T, Keys>> & { [K in DefaultKey]: T[K] })

export type AllowNoneOrOne<T, Keys extends keyof T> =
    | RequireOnlyOne<T, Keys>
    | Pick<T, Exclude<keyof T, Keys>>

//export type Shift<T extends any[]> = ((...t: T) => any) extends ((
//  first: any,
//  ...rest: infer Rest
//) => any)
//  ? Rest
//  : never;
//
//type ShiftUnion<T> = T extends any[] ? Shift<T> : never;

//export type DeepRequired<T, P extends string[]> = T extends object
//  ? (Omit<T, Extract<keyof T, P[0]>> &
//      Required<
//        {
//          [K in Extract<keyof T, P[0]>]: NonNullable<
//            DeepRequired<T[K], ShiftUnion<P>>
//          >
//        }
//      >)
//  : T;
export type DeepRequired<T> = Required<{
    [K in keyof T]: T[K] extends Required<T[K]> ? T[K] : DeepRequired<T[K]>
}>

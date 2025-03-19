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

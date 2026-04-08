export interface IBalance<T extends number|bigint = bigint> {
    mint: string,
    amount: T,
}

export type IBalanceList<T extends number|bigint = bigint> = Array<IBalance<T>>

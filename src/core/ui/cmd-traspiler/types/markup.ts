export type IMarkupOptionType = "name" | "value" | "defaultMk"

export interface IMarkupOption {
    text: string,
    type: "name" | "value" | "defaultMk",
    isRead?: boolean
    callback_data: string
}

/**
 * @param text - text to describe current action
 * @param options - list of options to choose from
 */
export interface IBaseMarkup {
    text: string
    options?: IMarkupOption[]
}

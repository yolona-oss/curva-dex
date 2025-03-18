export type IMarkupOptionType = "name" | "value" | "aux"

export interface IMarkupButton {
    text: string,
    type: IMarkupOptionType,
    isRead?: boolean
    data: string
}

/**
 * @param text - text to describe current action
 * @param buttons - list of options to choose from
 */
export interface IBaseMarkup {
    text: string
    buttons?: IMarkupButton[]
}

import { Identificable } from "@core/types/identificable";

export interface AbstractMBMarkupField extends Identificable {
    title: string
}

export interface TableMBMarkupField extends AbstractMBMarkupField {
    table: {
        header: string[]
        body: string[][]
    }
}

export interface TextMBMarkupField extends AbstractMBMarkupField {
    text: string
}

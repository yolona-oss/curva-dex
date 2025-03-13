import { union, optional, array, enums, Infer, object, string } from 'superstruct'
//import * as extractors from './extractors/index.js'

// BY BROWSER PLUGIN TODO MOVE TO NEW PLUGIN
const AllowedExtractionSources = [
    "Profile",
    "Mail",
    "URL",
    "Page",
    "JSON_API",
    "ElementAttr" ]

export const extractableObjSign = object({
    source: enums(AllowedExtractionSources),
    path: array(string()),
    append: optional(string()),
    prepend: optional(string()),
})

export const extractableSign = union([
    string(),
    extractableObjSign
])

export type extractableObj = Infer<typeof extractableObjSign>;
export type extractable = Infer<typeof extractableSign>;

// TODO add array and obj optional extraction
// TODO make input optionaly extendable by plugins
export async function extract(extractable: extractable): Promise<any> {
    let ret
    if (typeof extractable === "object") {
        throw "Unknown extractable " + typeof extractable
    } else if (typeof extractable === "string") {
        ret = extractable
    } else {
        throw "Unknown extractable " + typeof extractable
    }

    return ret
}

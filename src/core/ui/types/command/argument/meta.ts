import { CmdArgumentOptionSetter, CmdArgumentPairOptionsType } from "./option";
import "reflect-metadata";

const COMMAND_ARG_DESC_KEY = Symbol('descriptor:command-argument');

export interface CmdArgumentMeta {
    required: boolean
    description: string
    validator: (arg: string) => boolean

    position: number|null
    pairOptions?: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>
    defaultValue?: string
}

interface CmdArgumentDTO {
    required?: boolean
    description?: string
    validator?: (arg: string) => boolean

    position?: number|null
    pairOptions?: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>
    defaultValue?: string
}

const CmdArgumentDefaults: Partial<CmdArgumentMeta> = {
    validator: () => true,
    required: false,
    pairOptions: [],
    description: "Common argument",
    position: null,
    defaultValue: undefined
}

export function CmdArgument(metadata: CmdArgumentDTO) {
    return (target: any, propertyKey: string) => {
        const defaultsMergeMetadata = {
            ...CmdArgumentDefaults,
            ...metadata
        }
        if (defaultsMergeMetadata.position != null && defaultsMergeMetadata.position <= 0) {
            throw new Error(`@CmdArgument: position must be greater than 0`)
        }
        const existingMetadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, target) || {};
        existingMetadata[propertyKey] = defaultsMergeMetadata
        Reflect.defineMetadata(COMMAND_ARG_DESC_KEY, {...existingMetadata, ...defaultsMergeMetadata}, target)
    }
}

export type CmdArgumentMetadata<T extends string|number|symbol = string> = Record<T, CmdArgumentMeta>
export type CmdArgmuentKeyHolder = Record<string, any>

export function getCmdArgMetadata<T>(
    target: any
): CmdArgumentMetadata<keyof T> {
    let metadataMap: Partial<Record<keyof T, CmdArgumentMeta>> = {};
    let proto = target.prototype || Object.getPrototypeOf(target);

    while (proto && proto !== Object.prototype) {
        const metadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, proto);
        if (metadata) {
            for (const key in metadata) {
                if (key in CmdArgumentDefaults) {
                    continue
                }
                metadataMap[key as keyof T] = {
                    ...metadata[key],
                    ...metadataMap[key as keyof T],
                };
            }
        }
        proto = Object.getPrototypeOf(proto);
    }

    return metadataMap as CmdArgumentMetadata<keyof T>;
}

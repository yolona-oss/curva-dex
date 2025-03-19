import { validateArgumentDescriptor } from "./descriptor-helpers";
import { CmdArgumentOptionSetter, CmdArgumentPairOptionsType } from "./option";
import "reflect-metadata";

const COMMAND_ARG_DESC_KEY = Symbol('descriptor:command-argument');

/**
 * @description Command argument descriptor-like defenition
 */
export interface CmdArgumentMeta {
    readonly required: boolean
    readonly standalone: boolean
    readonly description: string
    readonly validator: (arg: string) => boolean

    readonly position: number|null
    readonly pairOptions?: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>
    readonly defaultValue?: string
}

/**
 * @description Command argument definition creation helper
 */
interface CmdArgumentDTO {
    required?: boolean
    description?: string
    standalone?: boolean
    validator?: (arg: string) => boolean

    position?: number|null
    pairOptions?: CmdArgumentPairOptionsType<CmdArgumentOptionSetter>
    defaultValue?: string
}

const CmdArgumentDefaults: CmdArgumentMeta = {
    validator: () => true,
    required: false,
    standalone: false,
    description: "Common argument",
    position: null,
    pairOptions: undefined,
    defaultValue: undefined
}

export function CmdArgument(metadata: CmdArgumentDTO) {
    return (target: any, propertyKey: string) => {
        const defaulted = {
            ...CmdArgumentDefaults,
            ...metadata
        }
        validateArgumentDescriptor(defaulted)
        const existingMetadata = Reflect.getMetadata(COMMAND_ARG_DESC_KEY, target) || {};
        existingMetadata[propertyKey] = defaulted
        Reflect.defineMetadata(COMMAND_ARG_DESC_KEY, {...existingMetadata, ...defaulted}, target)
    }
}

export type CmdArgumentMetadata<T extends string|number|symbol = string> = Record<T, CmdArgumentMeta>
export type CmdArgmuentKeyHolder = Record<string, any>

/**
 * @description @CmdArgument decorator metadata getter. Handles inheritance.
 * @returns Command argument metadata
 */
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

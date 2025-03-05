import { SERVICE_METADATA_KEY, ARG_METADATA_KEY } from "./constants"
import { ArgOptionsType } from "./types"

export interface IArgMetadataOption {
    required: boolean
    defaultValue?: string
    description: string
    options?: ArgOptionsType
    standalone: boolean
    validator?: (optValue: string) => boolean
}

const argoptDefautls: IArgMetadataOption = {
    required: false,
    description: "",
    standalone: true
}

export  function ParamMetadata(options: IArgMetadataOption) {
    return function (target: any, propertyKey: string) {
        const existingMetadata =
            Reflect.getMetadata(SERVICE_METADATA_KEY, target) || {};
        existingMetadata[propertyKey] = options;
        Reflect.defineMetadata(SERVICE_METADATA_KEY, existingMetadata, target);
    };
}

export function ArgMetadata(options: IArgMetadataOption) {
    return function (target: any, propertyKey: string) {
        const _opts = {
            ...argoptDefautls,
            ...options
        }
        //Reflect.defineMetadata('argMetadata', _opts, target, propertyKey);
        const existingMetadata =
            Reflect.getMetadata(SERVICE_METADATA_KEY, target) || {};
        existingMetadata[propertyKey] = _opts;
        Reflect.defineMetadata(SERVICE_METADATA_KEY, existingMetadata, target);
    };
}

export function getArgMetadata<T extends Record<string, any>>(instance: T): Partial<Record<keyof T, IArgMetadataOption>> {
    const metadataMap: Partial<Record<keyof T, IArgMetadataOption>> = {};

    // Iterate over all properties of the instance
    for (const key of Object.keys(instance) as Array<keyof T>) {
        const metadata = Reflect.getMetadata(ARG_METADATA_KEY, instance, key as string);
        if (metadata) {
            metadataMap[key] = metadata;
        }
    }

    return metadataMap
}

//export function getNamedArgMetadata<T extends DefaultServiceParamDef, TName extends string>(target: T, name: TName): IArgMetadataOption | undefined {
//    let metadata = Reflect.getMetadata(SERVICE_METADATA_KEY, target.constructor)?.[name];
//
//    let prototype = Object.getPrototypeOf(target);
//    while (!metadata && prototype && prototype !== Object.prototype) {
//        metadata = Reflect.getMetadata(SERVICE_METADATA_KEY, prototype.constructor)?.[name];
//        prototype = Object.getPrototypeOf(prototype);
//    }
//
//    return metadata;
//}

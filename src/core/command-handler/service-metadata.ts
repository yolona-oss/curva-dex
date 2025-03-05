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

const ArgMetadataDefaults: IArgMetadataOption = {
    required: false,
    description: "",
    standalone: true
}

export function ArgMetadata(metadata: IArgMetadataOption) {
    return function (target: any, propertyKey: string) {
        const defaultsMergeMetadata = {
            ...ArgMetadataDefaults,
            ...metadata
        }
        //Reflect.defineMetadata('argMetadata', _opts, target, propertyKey);
        //const existingMetadata =
        //    Reflect.getMetadata(ARG_METADATA_KEY, target) || {};
        //existingMetadata[propertyKey] = _opts;
        //Reflect.defineMetadata(ARG_METADATA_KEY, existingMetadata, target, propertyKey);
        Reflect.defineMetadata(ARG_METADATA_KEY, defaultsMergeMetadata, target, propertyKey);
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

//export function getArgUndefMetadata<T extends Record<string, any>>(target: T): Record<keyof T, IArgMetadataOption> {
//    const metadatamap: Partial<Record<keyof T, IArgMetadataOption>> = {}
//
//    const propertyKeys = Object.getOwnPropertyNames(target)
//
//    propertyKeys.forEach((propertyKey) => {
//        const metadata = Reflect.getMetadata(ARG_METADATA_KEY, target, propertyKey)
//        if (metadata) {
//            metadatamap[propertyKey as keyof T] = metadata
//        }
//    })
//
//    return metadatamap as Record<keyof T, IArgMetadataOption>
//}

export function getArgUndefMetadata<T extends Record<string, any>>(target: T): Record<keyof T, IArgMetadataOption> {
    const metadataMap: Partial<Record<keyof T, IArgMetadataOption>> = {}

    let currentTarget = target;
    while (currentTarget !== null && currentTarget !== Object.prototype) {
        const propertyKeys = Object.getOwnPropertyNames(currentTarget);

        propertyKeys.forEach((propertyKey) => {
            if (propertyKey === 'constructor' || typeof currentTarget[propertyKey] === 'function') {
                return;
            }

            const metadata = Reflect.getMetadata(ARG_METADATA_KEY, currentTarget, propertyKey);
            if (metadata && !metadataMap[propertyKey]) {
                metadataMap[propertyKey as keyof T] = metadata;
            }
        });

        // Move up the prototype chain
        currentTarget = Object.getPrototypeOf(currentTarget);
    }

    return metadataMap as Record<keyof T, IArgMetadataOption>
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

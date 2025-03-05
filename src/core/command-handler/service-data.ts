import { SERVICE_METADATA_KEY } from "./constants";
import { genRandomString } from "@core/utils/random";
import { ArgMetadata, getArgUndefMetadata, IArgMetadataOption } from "./service-metadata";

import { sessionIdValidator, sessionOptsWithRand } from "./utils/misc";

import 'reflect-metadata'
import { camelCase } from "@core/utils/misc";

//type ExcludeFunctionPropertyNames<T> = Pick<T, {
//    [K in keyof T]: T[K] extends Function ? never : K
//}[keyof T]>;

export function toDescriptor<T extends Object>(instance: T): Record<keyof T, IArgMetadataOption> {
    return getArgUndefMetadata(instance)
    //const metadata = getArgUndefMetadata(instance)
    //let ret: Record<string, any> = {}
    //for (const key in metadata) {
    //    const meta = metadata[key]
    //    if (meta) {
    //        Object.assign(ret, { [key]: meta.defaultValue })
    //    }
    //}
    //return ret as Record<keyof T, IArgMetadataOption>
}

class BaseDataStore {
    constructor() { }
}

export abstract class BaseServiceConfig extends BaseDataStore {
}

export class BaseServiceParameters extends BaseDataStore {
    @ArgMetadata({
        required: false,
        standalone: false,
        options: sessionOptsWithRand,
        defaultValue: genRandomString(4),
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    sessionId?: string

    @ArgMetadata({
        required: false,
        standalone: false,
        options: sessionOptsWithRand,
        defaultValue: genRandomString(4),
        validator: sessionIdValidator,
        description: "Session id to restore state from."
    })
    s?: string
}

export class BaseServiceInteractMessages extends BaseDataStore {
    @ArgMetadata({
        required: false,
        description: "Echo message",
        standalone: false,
        defaultValue: "R U GAY?"
    })
    echo!: string
}

export class ServiceData<
        TConfig extends BaseServiceConfig = BaseServiceConfig,
        TParams extends BaseServiceParameters = BaseServiceParameters,
        TMessages extends BaseServiceInteractMessages = BaseServiceInteractMessages
    >
{
    constructor(
        public config: TConfig,
        public params: TParams,
        public messages: TMessages
    ) { }
}

/**
 * @description Parse every of BaseServiceParameters, BaseServiceConfig, BaseServiceInteractMessages.
 * All of parameters must start with duble dash: "--", algorithm conver all parameters to camelCase and remove all dashes.
 * So you must use in Base classes camelCase names and pass parameters with -- and separate word with -. e.g. "--session-id" to "sessionId" or '--BIG-SFD' to "bigSfd"
 */
export function parseServiceData<T extends BaseDataStore>(args: string[], Store: new () => T): T {
    const params = new Store()
    const metadata = Reflect.getMetadata(SERVICE_METADATA_KEY, Store.prototype) as Record<keyof T, IArgMetadataOption>

    let i = 0;
    while (i < args.length) {
        let arg = args[i]

        if (arg.startsWith("--")) {
            const key = camelCase(arg.slice(2)) as keyof T
            const meta = metadata[key]

            if (!meta) {
                throw new Error(`Unknown argument: ${arg}`)
            }

            if (meta.standalone) {
                // Boolean flag (e.g., --dry-run)
                (params as any)[key] = true
            } else {
                // Argument with value (e.g., --session-id 123)
                const value = args[i + 1]

                if (!value || value.startsWith("--")) {
                    throw new Error(`Missing value for argument: ${arg}`)
                }

                if (meta.validator && !meta.validator(value)) {
                    throw new Error(`Invalid value for ${arg}: ${value}`)
                }

                (params as any)[key] = value
                i++
            }
        }
        i++
    }

    // Apply default values and check required fields
    for (const key in metadata) {
        const meta = metadata[key]

        if ((params as any)[key] === undefined) {
            if (meta.defaultValue !== undefined) {
                (params as any)[key] = meta.defaultValue
            } else if (meta.required) {
                throw new Error(`Missing required parameter: --${key}`)
            }
        }
    }

    return params
}

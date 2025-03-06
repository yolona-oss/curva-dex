import { Schema, Document, Model } from 'mongoose';
import { assignToCustomPath, extractValueFromObject } from '@utils/object';

import "reflect-metadata";
import { MODULE_SESSION_ID_MARK } from '@core/command-handler';
import log from '@core/utils/logger';

export interface IModuledData {
    module: string
    comment: string
    data: any
}

export interface IAccount extends Document {
    modules: Array<IModuledData>
}

function validateModuleName(name: string): boolean {
    return Boolean(name.match(/^[\:#@a-zA-Z0-9_-]+$/))
}

async function addToIndexer(this: IAccount, module_name: string) {
    const indexer = this.modules.find(o => o.module === MODULE_NAMES_INDEXER)
    if (!indexer) {
        this.modules.push({
            module: MODULE_NAMES_INDEXER,
            comment: `Linked modules list`,
            data: {
                list_modules: [module_name]
            }
        })
    } else {
        indexer.data.list_modules.push(module_name)
    }
    await this.save()
}

function removeFromIndexer(this: IAccount, module_name: string) {
    const indexer = this.modules.find(o => o.module === MODULE_NAMES_INDEXER)
    if (indexer) {
        indexer.data.list_modules = indexer.data.list_modules.filter((o: string) => o !== module_name)
    }
}

async function removeLinkedSessionModules(this: IAccountMethods&IAccount, module_name: string) {
    const module_name_parts = this.splitModuleName(module_name)
    const base_name = module_name_parts[0]
    const session_id = module_name_parts.find(o => o.startsWith(MODULE_SESSION_ID_MARK))
    if (session_id) {
        const linked_modules = await this.getLinkedModules(base_name)
        for (const linked_module of linked_modules) {
            const linked_module_parts = this.splitModuleName(linked_module)
            if (linked_module_parts.includes(session_id)) {
                const session_module = this.modules.find(o => o.module === linked_module)
                if (!session_module) {
                    log.warn(`Session module "${linked_module}" not found, but listed in indexer!`)
                    continue
                }
                const session_module_ind = this.modules.indexOf(session_module)
                this.modules.splice(session_module_ind, 1)
            }
        }
    }
}

interface IAccountMethods {
    setModuleData(module_name: string, path: string, payload: any, comment?: string): Promise<IAccount>
    getLinkedModules(base_name: string): Promise<string[]>
    unsetModuleData(module_name: string, path?: string): Promise<IAccount>
    getModuleData<T>(module_name: string, path?: string): Promise<T|null>
    extendModuleName(base_name: string, extensions: string[]): string
    splitModuleName(full_name: string): string[]
}

export type AccountModelType = Model<IAccount, {}, IAccountMethods>

const ModuleSchema: Schema<IModuledData> = new Schema({
    module: { type: String, required: true },
    comment: { type: String, required: false, default: '' },
    data: { type: Schema.Types.Mixed, required: true },
});

export const MODULE_NAMES_INDEXER = "__module_list__"
export const MODULE_NAME_DELIMITER = "::"

export const AccountSchema: Schema<IAccount, {}, IAccountMethods> = new Schema(
    {
        modules: { type: [ModuleSchema], required: true, default: [] },
    },
    {
        methods: {
            async setModuleData(module_name: string, path: string, payload: any, comment = '') {
                if (!validateModuleName(module_name)) {
                    throw new Error(`Invalid module name "${module_name}"`)
                }

                if (module_name.toLowerCase() == MODULE_NAMES_INDEXER.toLowerCase()) {
                    throw new Error(`Module name "${MODULE_NAMES_INDEXER}" is reserved`)
                }

                if (comment === '') {
                    comment = module_name
                }
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment,
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }

                if (!desireModule.data) {
                    desireModule.data = {}
                }

                await addToIndexer.bind(this)(module_name)

                assignToCustomPath(desireModule.data, path, payload)
                console.log(desireModule)
                await this.save()
                return this
            },
            async getLinkedModules(base_name: string): Promise<string[]> {
                const list = this.modules.find(o => o.module === MODULE_NAMES_INDEXER)
                if (list) {
                    const m_list = list.data.list_modules as string[]
                    return m_list.filter(o => o.startsWith(base_name))
                }
                return [] as string[]
            },
            async unsetModuleData(module_name: string, path: string = '') {
                const module_name_parts = this.splitModuleName(module_name)
                if (module_name_parts.includes(MODULE_NAMES_INDEXER)) {
                    throw new Error(`Cannot remove indexer module.`)
                }
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment: module_name,
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }

                if (path === '') {
                    removeFromIndexer.bind(this)(module_name)

                    // delete
                    this.modules.splice(this.modules.indexOf(desireModule), 1)

                    // delete session modules
                    await removeLinkedSessionModules.bind(this)(module_name)
                } else {
                    assignToCustomPath(desireModule, path, null)
                }

                await this.save()
                return this
            },
            async getModuleData(module_name: string, path: string = ""): Promise<any|null> {
                let desireModule = this.modules.find(o => o.module === module_name)
                if (!desireModule) {
                    this.modules.push({
                        module: module_name,
                        comment: '',
                        data: {}
                    })
                    desireModule = this.modules[this.modules.length - 1]
                }
                const data = extractValueFromObject(desireModule.data, path)
                return data === null ? null : { ...data }
            },
            extendModuleName(base_name: string, extensions: string[]) {
                if (!validateModuleName(base_name)) {
                    throw new Error(`Invalid base module name "${base_name}"`)
                }
                if (extensions.some(o => !validateModuleName(o))) {
                    throw new Error(`Invalid extension module name "${extensions}"`)
                }
                return extensions.reduce((acc, curr) => {
                    const append = curr === "" || !curr ? "" : `${MODULE_NAME_DELIMITER}${curr}`
                    return `${acc}${append}`
                }, base_name)
            },
            splitModuleName(full_name: string) {
                return full_name.split(MODULE_NAME_DELIMITER)
            }
        }
    }
);

AccountSchema.pre<IAccount>('save', function(next) {
    if (this.isNew) {
        if (!Array.isArray(this.modules)) {
            this.modules = []
        }
        this.modules.push({
            module: MODULE_NAMES_INDEXER,
            comment: `Linked modules list`,
            data: {
                list_modules: []
            }
        })
    }

    if (next && next instanceof Function) {
        next()
    }
})

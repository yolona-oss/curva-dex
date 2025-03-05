import { Schema, Document, Model } from 'mongoose';
import { assignToCustomPath, extractValueFromObject } from '@utils/object';

import "reflect-metadata";

export interface IModuledData {
    module: string
    comment: string
    data: any
}

export interface IAccount extends Document {
    modules: Array<IModuledData>
}

function validateModuleName(name: string): boolean {
    return Boolean(name.match(/^[a-zA-Z0-9_-]+$/))
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
    comment: { type: String, required: true, default: '' },
    data: { type: Object, required: true },
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
                    const modules_list = this.modules.find(o => o.module === MODULE_NAMES_INDEXER)
                    if (!modules_list) {
                        this.modules.push({
                            module: MODULE_NAMES_INDEXER,
                            comment: `Linked modules list`,
                            data: {
                                list_modules: [module_name]
                            }
                        })
                    }
                }

                assignToCustomPath(desireModule.data, path, payload)
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
                    const list = this.modules.find(o => o.module === MODULE_NAMES_INDEXER)
                    if (list) {
                        list.data.list_modules = list.data.list_modules.filter((o: string) => o !== module_name)
                    }
                    this.modules.splice(this.modules.indexOf(desireModule), 1)
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
                if (!validateModuleName(base_name) || extensions.some(o => !validateModuleName(o))) {
                    throw new Error(`Invalid module name "${base_name}"`)
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

AccountSchema.pre('init', function(next) {
    this.modules.push({
        module: MODULE_NAMES_INDEXER,
        comment: `Linked modules list`,
        data: {
            list_modules: []
        }
    })
    next()
})

//AccountSchema.set('toJSON', {
//    virtuals: true,
//    transform: (doc, ret, options) => {
//        const { _id, modules } = { ...ret };
//        return { id: _id, modules };
//    }
//});

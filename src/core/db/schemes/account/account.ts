import mongoose, { Schema, Document, Model } from 'mongoose';
import { DbModelsEnum } from '@core/db/models-enum';

import { AccountModule, IAccountModule } from './module';

import "reflect-metadata";

export interface IAccount extends Document {
    owner_id: Schema.Types.ObjectId
    module_ids: Schema.Types.ObjectId[]
}

interface IAccountMethods {
    getModules(): Promise<IAccountModule[]>,
    getModuleByName(): Promise<IAccountModule|undefined>
    deleteModule(): Promise<IAccount>
}

export type AccountModelType = Model<IAccount, {}, IAccountMethods>

export const AccountSchema: Schema<IAccount, AccountModelType> = new Schema(
    {
        owner_id: { type: Schema.Types.ObjectId, ref: DbModelsEnum.Managers, required: true },
        module_ids: { type: [Schema.Types.ObjectId], ref: DbModelsEnum.AccountModules, default: [] },
    },
    {
        query: {
            findByOwnerId: async function (owner_id: Schema.Types.ObjectId) {
                return await this.where({ owner_id })
            },
            findModulesByOwnerId: async function (owner_id: Schema.Types.ObjectId) {
                const doc = await this
                    .where({ owner_id })
                    .populate<{module_ids: IAccountModule[]}>('module_ids')
                return doc.module_ids
            },
        },
        methods: {
            getModules: async function(): Promise<IAccountModule[]> {
                return (await this.populate<{module_ids: IAccountModule[]}>('module_ids')).module_ids
            },
            getModuleByName: async function(name: string): Promise<IAccountModule|undefined> {
                return (await this.populate<{module_ids: IAccountModule[]}>('module_ids')).module_ids.find(m => m.name === name)
            },
            deleteModule: async function(name: string): Promise<IAccount> {
                const data_module = (await this.populate<{module_ids: IAccountModule[]}>('module_ids')).module_ids.find(m => m.name === name)
                if (data_module) {
                    this.module_ids = this.module_ids.filter(m => m !== data_module._id)
                    await this.save()
                    await AccountModule.findByIdAndDelete(data_module._id)
                } else {
                    console.log("module not found")
                }
                return this
            }
        }
    }
);

export const Account = mongoose.model<IAccount, AccountModelType>(DbModelsEnum.Accounts, AccountSchema)

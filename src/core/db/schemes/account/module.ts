import mongoose, { Document, HydratedDocument, Model, QueryWithHelpers, Schema } from "mongoose";
import { DbModelsEnum } from "@core/db/models-enum";
import { AccountModelType } from "./account";

export interface IAccountModuleCreateDto {
    name: string,
    data: any,
    account_id: string
}

export interface IAccountModule extends Document {
    name: string
    data: any
    account_id: Schema.Types.ObjectId
    session_id?: Schema.Types.ObjectId
}

export interface IAccountModuleQueryHelpers {
    byName(account_id: string, module_name: string): QueryWithHelpers<
        HydratedDocument<IAccountModule>[],
        HydratedDocument<IAccountModule>,
        IAccountModuleQueryHelpers
    >
}

export interface IAccountModuleMethods {
}

export type AccountModuleModelType = Model<IAccountModule, IAccountModuleQueryHelpers, IAccountModuleMethods>

export const AccountModuleSchema: Schema<IAccountModule, AccountModelType, IAccountModuleMethods, IAccountModuleQueryHelpers> = new Schema({
    name: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: false, default: {} },

    session_id: { type: Schema.Types.ObjectId, ref: DbModelsEnum.AccountSessions, required: false },
    account_id: { type: Schema.Types.ObjectId, ref: DbModelsEnum.Accounts, required: true },
},
    {
        timestamps: true,
        methods: {

        },
        query: {
            byName(this: AccountModuleModelType, account_id: string, module_name: string) {
                return this.find({ account_id, name: module_name })
            },
        }
    }
);

export const AccountModule = mongoose.model<IAccountModule, AccountModuleModelType>(DbModelsEnum.AccountModules, AccountModuleSchema)

function isValidModuleName(name: string): boolean {
    return Boolean(name.match(/^[\:a-zA-Z0-9_]+$/))
}

AccountModuleSchema.pre('save', function(next) {
    if (!isValidModuleName(this.name)) {
        next(new Error('Invalid module name'))
    }
})

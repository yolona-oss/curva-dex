export { MongoConnect } from './mongoose'
export { type IManager, type IFile, type IAccount } from './schemes'

import mongoose from 'mongoose'
import { AccountSchema, FileSchema, IAccount, IFile, IManager, ManagerSchema } from './schemes'
import { DbModelsEnum } from './models-enum'

export const Manager = mongoose.model<IManager>(DbModelsEnum.Managers, ManagerSchema)
export const File = mongoose.model<IFile>(DbModelsEnum.Files, FileSchema)
export { FilesWrapper } from './file-schema-wrapper'

import { AccountModelType } from './schemes/account'

export const Account = mongoose.model<IAccount, AccountModelType>(DbModelsEnum.Accounts, AccountSchema)

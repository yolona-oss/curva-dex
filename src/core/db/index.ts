export { MongoConnect } from './mongoose'
export { type IManager, type IFile, type IAccount } from './schemes'

import mongoose from 'mongoose'
import { AccountSchema, FileSchema, IAccount, IFile, IManager, ManagerSchema } from './schemes'
import { DbModelsEnum } from './models-enum'

import { ManagerModelType } from './schemes/manager'
export const Manager = mongoose.model<IManager, ManagerModelType>(DbModelsEnum.Managers, ManagerSchema)

export const File = mongoose.model<IFile>(DbModelsEnum.Files, FileSchema)
export { FilesWrapper } from './file-schema-wrapper'

export { Account } from './schemes/account'

import { IMsgHistory, MsgHistorySchema } from './schemes/messages-history'
export const MsgHistory = mongoose.model<IMsgHistory>(DbModelsEnum.MsgHistory, MsgHistorySchema)

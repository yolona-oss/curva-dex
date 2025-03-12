export { MongoConnect } from './mongoose'
export { type IManager, type IFile } from './schemes'

import mongoose from 'mongoose'
import { FileSchema, IFile, IManager, ManagerSchema } from './schemes'
import { DbModelsEnum } from './models-enum'

import { ManagerModelType } from './schemes/manager'
export const Manager = mongoose.model<IManager, ManagerModelType>(DbModelsEnum.Managers, ManagerSchema)
export const File = mongoose.model<IFile>(DbModelsEnum.Files, FileSchema)
export { FilesWrapper } from './file-schema-wrapper'

export { Account, AccountSession, AccountModule } from './schemes/account'
export type { IAccount, IAccountSession, IAccountModule } from './schemes/account'
export type { IAccountSessionCreateDto, IAccountModuleCreateDto } from './schemes/account'

import { IMsgHistory, MsgHistorySchema } from './schemes/messages-history'
export const MsgHistory = mongoose.model<IMsgHistory>(DbModelsEnum.MsgHistory, MsgHistorySchema)

import { DefaultAssetsSchema, type IDefaultAssets } from './schemes/default-assets'
export const DefaultAssets = mongoose.model<IDefaultAssets>(DbModelsEnum.DefaultAssets, DefaultAssetsSchema)

import { type ICmdAlias, CmdAliasSchema } from './schemes/cmd-alias'
export const CmdAlias = mongoose.model<ICmdAlias>(DbModelsEnum.CmdAliases, CmdAliasSchema)

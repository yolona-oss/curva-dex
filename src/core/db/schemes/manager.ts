import { Account, FilesWrapper, MsgHistory } from '@core/db';
import { DbModelsEnum } from '@core/db/models-enum';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IMsgHistory, IMsgHistoryDto } from './messages-history';
import { OPQBuilder } from '@core/utils/opq-builder';

export interface IManager extends Document {
    userId: number;
    name: string,
    isAdmin?: boolean;
    online?: boolean;
    avatar: mongoose.Types.ObjectId;
    useGreeting?: boolean;
    account: mongoose.Types.ObjectId
}

interface IManagerMethods {
    // TODO pagination
    getMessagesHistory(): Promise<IMsgHistory[]>,
    appendMessageHistory(msg: IMsgHistoryDto): Promise<IManager>,
    editMessageHistory(msg: IMsgHistoryDto): Promise<IManager>,
    deleteMessage(message_id: number): Promise<IManager>
}

export type ManagerModelType = Model<IManager, {}, IManagerMethods>

export const ManagerSchema: Schema<IManager> = new Schema(
    {
        userId: { type: Number, required: true, unique: true },
        name: { type: String, required: true, unique: true },
        isAdmin: { type: Boolean, required: false, default: false },
        online: { type: Boolean, required: false, default: false },
        avatar: { type: mongoose.Schema.Types.ObjectId, ref: DbModelsEnum.Files, default: null },
        useGreeting: { type: Boolean, required: false, default: true },
        account: { type: mongoose.Schema.Types.ObjectId, ref: DbModelsEnum.Accounts, default: null },
    },
    {
        methods: {
            async getMessagesHistory(): Promise<IMsgHistory[]> {
                const messages = await MsgHistory.find({ userId: this.userId })
                return messages ?? []
            },
            async appendMessageHistory(_msg: IMsgHistoryDto): Promise<IManager> {
                let timestamp
                if (_msg.timestamp) {
                    const digits = _msg.timestamp.toString().length
                    const jsDigits = Date.now().toString().length
                    const dig_diff = jsDigits - digits
                    if (dig_diff > 0) {
                        timestamp = _msg.timestamp * 10 ** dig_diff
                    }
                }

                const msg = {
                    ..._msg,
                    timestamp
                }
                const message = await MsgHistory.create(msg)
                console.log("message seved", message.text)
                await message.save()
                return this
            },
            async editMessageHistory(_msg: IMsgHistoryDto): Promise<IManager> {
                const msg = {
                    ..._msg,
                    isEdited: true
                }
                await MsgHistory.updateOne({ message_id: msg.message_id, userId: msg.userId }, msg)
                return this
            },
            async deleteMessage(message_id: number): Promise<IManager> {
                await MsgHistory.deleteOne({ message_id: message_id })
                return this
            }
        }
    }
);

ManagerSchema.pre('save', async function (next) {
    try {
        if (!this.avatar) {
            this.avatar = (await FilesWrapper.getDefaultAvatar())!.id
        }
        if (!this.account) {
            this.account = (await Account.create({ modules: [] })).id
        }
    } catch (e: any) {
        next(e)
    }
})

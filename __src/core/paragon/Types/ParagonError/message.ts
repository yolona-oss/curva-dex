import { ParagonErrorType } from './enum'

export interface IErrorMessage {
    type: ParagonErrorType;
    errorMessage: string;
    userMessage: string;
}

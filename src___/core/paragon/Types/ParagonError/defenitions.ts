import { ParagonErrorType } from './enum'
import { IErrorMessage } from './message'

export const ErrorsDefenition: Record<ParagonErrorType, IErrorMessage> = {
    [ParagonErrorType.ATOM_ERROR]: {
        type: ParagonErrorType.ATOM_ERROR,
        errorMessage: 'Atom execution error',
        userMessage: 'Atom execution error',
    }
}

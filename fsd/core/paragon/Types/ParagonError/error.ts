import { ParagonErrorType } from './enum';
import { ErrorsDefenition } from './defenitions';
import { IErrorMessage } from './message';

interface IErrorModifOpt extends Pick<IErrorMessage, 'errorMessage' | 'userMessage'> {
    errorMessage: string
    userMessage: string
}

export class ParagonError extends Error {
    public errorCode: ParagonErrorType;
    public errorMessage: string;
    public userMessage: string;

    constructor(
        errorCode: ParagonErrorType = ParagonErrorType.ATOM_ERROR,
        options?: Partial<IErrorModifOpt>
    ) {
        super();
        const error: IErrorMessage = ErrorsDefenition[errorCode];
        if (options) {
            // @ts-ignore // TODO
            Object.keys(options).forEach(key => error[key] = options[key])
        }
        if (!error) throw new Error('Unable to find message code error.');
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.errorCode = errorCode;
        this.errorMessage = error.errorMessage;
        this.userMessage = error.userMessage;
    }
}

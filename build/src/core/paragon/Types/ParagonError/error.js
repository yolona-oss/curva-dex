"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParagonError = void 0;
const enum_1 = require("./enum");
const defenitions_1 = require("./defenitions");
class ParagonError extends Error {
    errorCode;
    errorMessage;
    userMessage;
    constructor(errorCode = enum_1.ParagonErrorType.ATOM_ERROR, options) {
        super();
        const error = defenitions_1.ErrorsDefenition[errorCode];
        if (options) {
            Object.keys(options).forEach(key => error[key] = options[key]);
        }
        if (!error)
            throw new Error('Unable to find message code error.');
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.errorCode = errorCode;
        this.errorMessage = error.errorMessage;
        this.userMessage = error.userMessage;
    }
}
exports.ParagonError = ParagonError;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorsDefenition = void 0;
const enum_1 = require("./enum");
exports.ErrorsDefenition = {
    [enum_1.ParagonErrorType.ATOM_ERROR]: {
        type: enum_1.ParagonErrorType.ATOM_ERROR,
        errorMessage: 'Atom execution error',
        userMessage: 'Atom execution error',
    }
};

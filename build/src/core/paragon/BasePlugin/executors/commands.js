"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const ss = __importStar(require("superstruct"));
const cmd = __importStar(require("./common"));
const constants_1 = require("./constants");
exports.commands = [
    {
        name: constants_1.BASE_ACTIONS.SetVariable,
        description: "Settings new variable or updating an exists",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            },
            {
                position: 1,
                type: new ss.Struct({ type: "any", schema: null }),
                description: "Variable value",
                path: "value"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.SetVariable
    },
    {
        name: constants_1.BASE_ACTIONS.ExistsVariable,
        description: "Check for variable existance",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.ExistsVariable
    },
    {
        name: constants_1.BASE_ACTIONS.RemoveVariable,
        description: "Removing variable",
        inputs: [
            {
                position: 0,
                type: new ss.Struct({ type: "string", schema: null }),
                description: "Variable name",
                path: "name"
            }
        ],
        returnValue: ss.never(),
        fn: cmd.RemoveVariable
    },
    {
        name: constants_1.BASE_ACTIONS.Dummy,
        description: "Do nothing",
        inputs: [],
        returnValue: ss.never(),
        fn: cmd.Dummy
    },
];

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
exports.IBaseInputSign = exports.BaseInput = void 0;
exports.getInputs = getInputs;
const ss = __importStar(require("superstruct"));
const extractable_js_1 = require("./extractable.js");
const object_js_1 = require("@utils/object.js");
class BaseInput {
    position;
    type;
    optional;
    description;
    path;
    constructor(obj) {
        this.position = obj.position;
        this.type = obj.type;
        this.optional = obj.optional ?? false;
        this.description = obj.description ?? "no description";
        this.path = obj.path;
    }
}
exports.BaseInput = BaseInput;
async function getInputs(state, inputs, obj) {
    let ret = new Array();
    for (const input of inputs) {
        let val;
        if (input.path[0] == '$') {
            const path = input.path.slice(1);
            val = (0, object_js_1.extractValueFromObject)(state, path);
        }
        else {
            try {
                val = await (0, extractable_js_1.extract)((0, object_js_1.extractValueFromObject)(obj, input.path));
            }
            catch (e) {
                if (!input.optional) {
                    throw e;
                }
            }
        }
        ret.push(val);
    }
    return ret;
}
exports.IBaseInputSign = ss.object({
    position: ss.number(),
    type: ss.any(),
    optional: ss.optional(ss.boolean()),
    description: ss.optional(ss.string()),
    path: ss.string()
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptSign = exports.scriptBrowserAdaptersSign = exports.scriptProcedureSign = exports.scriptActionSign = exports.scriptActionNextSign = void 0;
const superstruct_1 = require("superstruct");
exports.scriptActionNextSign = (0, superstruct_1.union)([(0, superstruct_1.number)(), (0, superstruct_1.string)()]);
exports.scriptActionSign = (0, superstruct_1.union)([
    (0, superstruct_1.object)({
        id: (0, superstruct_1.number)(),
        description: (0, superstruct_1.optional)((0, superstruct_1.string)()),
        entryPoint: (0, superstruct_1.optional)((0, superstruct_1.boolean)()),
        next: (0, superstruct_1.optional)(exports.scriptActionNextSign),
        command: (0, superstruct_1.string)(),
        conditional: (0, superstruct_1.optional)((0, superstruct_1.array)((0, superstruct_1.assign)((0, superstruct_1.object)({
            checkFn: (0, superstruct_1.string)(),
            next: exports.scriptActionNextSign
        }), (0, superstruct_1.object)({}))))
    }),
    (0, superstruct_1.any)()
]);
exports.scriptProcedureSign = (0, superstruct_1.record)((0, superstruct_1.string)(), (0, superstruct_1.array)(exports.scriptActionSign));
exports.scriptBrowserAdaptersSign = (0, superstruct_1.enums)(["AdsPower", "Common", "Stealth"]);
exports.scriptSign = (0, superstruct_1.object)({
    name: (0, superstruct_1.string)(),
    maxExecutionTime: (0, superstruct_1.number)(),
    procedures: exports.scriptProcedureSign,
    actions: (0, superstruct_1.array)(exports.scriptActionSign),
    finally: (0, superstruct_1.optional)((0, superstruct_1.string)()),
});

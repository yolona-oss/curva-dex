"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSchema = void 0;
const mongoose_1 = require("mongoose");
const object_1 = require("@utils/object");
const ModuleSchema = new mongoose_1.Schema({
    module: { type: String, required: true },
    comment: { type: String, required: true, default: '' },
    data: { type: Object, required: true },
});
exports.AccountSchema = new mongoose_1.Schema({
    modules: { type: [ModuleSchema], required: true, default: [] },
}, {
    methods: {
        async setModuleData(module_name, path, payload, comment = '') {
            if (comment === '') {
                comment = module_name;
            }
            let desireModule = this.modules.find(o => o.module === module_name);
            if (!desireModule) {
                this.modules.push({
                    module: module_name,
                    comment,
                    data: {}
                });
                desireModule = this.modules[this.modules.length - 1];
            }
            (0, object_1.assignToCustomPath)(desireModule.data, path, payload);
            await this.save();
            return this;
        },
        async unsetModuleData(module_name, path) {
            let desireModule = this.modules.find(o => o.module === module_name);
            if (!desireModule) {
                this.modules.push({
                    module: module_name,
                    comment: module_name,
                    data: {}
                });
                desireModule = this.modules[this.modules.length - 1];
            }
            (0, object_1.assignToCustomPath)(desireModule, path, null);
            await this.save();
            return this;
        },
        async getModuleData(module_name, path = "") {
            let desireModule = this.modules.find(o => o.module === module_name);
            if (!desireModule) {
                this.modules.push({
                    module: module_name,
                    comment: '',
                    data: {}
                });
                desireModule = this.modules[this.modules.length - 1];
            }
            const data = (0, object_1.extractValueFromObject)(desireModule.data, path);
            return data === null ? null : { ...data };
        }
    }
});

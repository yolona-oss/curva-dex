"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerBarHelper = exports.mpb = void 0;
exports.taskBarID = taskBarID;
exports.createMainProgress = createMainProgress;
exports.updateMainProgress = updateMainProgress;
const multi_progress_bars_1 = require("multi-progress-bars");
const chalk_1 = __importDefault(require("chalk"));
const projectname = "web3-multiprofile";
function taskBarID(obj) {
    return "id:" + obj.id;
}
class WorkerBarHelper {
    obj;
    tasks;
    curTask = 0;
    constructor(obj, tasks) {
        this.obj = obj;
        this.tasks = tasks;
    }
    create() {
        exports.mpb.addTask(taskBarID(this.obj), {
            type: "percentage",
            message: "",
            barTransformFn: (m) => chalk_1.default.blueBright(m),
            percentage: 0
        });
    }
    next(i) {
        this.curTask = i;
        exports.mpb.updateTask(taskBarID(this.obj), {
            message: this.tasks[this.curTask],
            percentage: this.curTask / this.tasks.length
        });
    }
    done(success, desc) {
        exports.mpb.done(taskBarID(this.obj), {
            barTransformFn: (m) => chalk_1.default[(success ? "green" : "red")](m),
            message: (success ? desc ?? "Success" : desc ?? "Failed")
        });
    }
}
exports.WorkerBarHelper = WorkerBarHelper;
function createMainProgress(cur, overall) {
    exports.mpb = new multi_progress_bars_1.MultiProgressBars({
        initMessage: ' $ ' + projectname + ' ',
        anchor: 'top',
        persist: true,
        border: true,
    });
    exports.mpb.addTask("Progress", {
        type: "percentage",
        message: cur + "/" + overall + " 0 errors",
        barTransformFn: (m) => chalk_1.default.blueBright(m)
    });
}
function updateMainProgress(cur, overall, errors) {
    exports.mpb.updateTask("Progress", {
        message: cur + "/" + overall + " " + errors + " errors"
    });
}

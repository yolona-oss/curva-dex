"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateSign = exports.actions = void 0;
const State_1 = require("@paragon/Types/State");
const constants_1 = require("./constants");
exports.actions = [
    constants_1.BASE_ACTIONS.Dummy,
    constants_1.BASE_ACTIONS.SetVariable,
    constants_1.BASE_ACTIONS.RemoveVariable,
    constants_1.BASE_ACTIONS.ExistsVariable,
    constants_1.BASE_ACTIONS.Sleep,
];
exports.StateSign = State_1.BaseStateSign;

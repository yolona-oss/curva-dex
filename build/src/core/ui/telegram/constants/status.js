"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageStatus = exports.chatStatus = exports.managerStatus = void 0;
var managerStatus;
(function (managerStatus) {
    managerStatus[managerStatus["offline"] = 0] = "offline";
    managerStatus[managerStatus["online"] = 1] = "online";
    managerStatus[managerStatus["inChat"] = 2] = "inChat";
})(managerStatus || (exports.managerStatus = managerStatus = {}));
;
var chatStatus;
(function (chatStatus) {
    chatStatus[chatStatus["closed"] = 0] = "closed";
    chatStatus[chatStatus["pending"] = 1] = "pending";
    chatStatus[chatStatus["active"] = 2] = "active";
})(chatStatus || (exports.chatStatus = chatStatus = {}));
;
var messageStatus;
(function (messageStatus) {
    messageStatus[messageStatus["handled"] = 0] = "handled";
    messageStatus[messageStatus["unHandled"] = 1] = "unHandled";
})(messageStatus || (exports.messageStatus = messageStatus = {}));
;

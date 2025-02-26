"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitializeUserCommands = InitializeUserCommands;
const user_services_1 = require("./user-services");
const pump_fun_service_1 = require("./pump.fun.service");
function InitializeUserCommands() {
    return [
        {
            command: {
                command: "check_seq_1",
                description: "Check sequence first",
                next: ["check_seq_2"]
            },
            handler: async function (ctx) {
                await ctx.reply("now you can call cmd: /check_seq_2");
            }
        },
        {
            command: {
                command: "check_seq_2",
                description: "Check sequence cmd",
                prev: "check_seq_1"
            },
            handler: async function (ctx) {
                await ctx.reply("check_seq_2 success");
            }
        },
        {
            command: {
                command: "blob",
                description: "Test service",
            },
            handler: new user_services_1.ServiceOne("")
        },
        {
            command: {
                command: "example",
                description: "run example trade pattern",
            },
            handler: async function (ctx) {
                await ctx.reply("Impl removed.");
            }
        },
        {
            command: {
                command: pump_fun_service_1.serviceName,
                description: pump_fun_service_1.serviceDescription,
                args: pump_fun_service_1.serviceArgs
            },
            handler: new pump_fun_service_1.PumpFunRobot("")
        }
    ];
}

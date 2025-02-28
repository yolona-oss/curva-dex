import { BaseUIContext } from "@core/ui"
import { ICmdRegisterMany } from "@core/command-handler/command-handler"

import { TestService } from "./user-services"
import { PumpFunRobot,
    serviceName as pumpFunRobot_CommandName,
    serviceDescription as pumpServiceDescription,
    serviceArgs as pumpServiceArgs
} from './pump.fun.service'

export function InitializeUserCommands<Ctx extends BaseUIContext>(): ICmdRegisterMany<Ctx> {
    return [
        {
            command: {
                command: "check_seq_1",
                description: "Check sequence first",
                next: ["check_seq_2"]
            },
            handler: async function(ctx: BaseUIContext) {
                await ctx.reply("now you can call cmd: /check_seq_2")
            }
        },
        {
            command: {
                command: "check_seq_2",
                description: "Check sequence cmd",
                prev: "check_seq_1"
            },
            handler: async function(ctx: BaseUIContext) {
                await ctx.reply("check_seq_2 success")
            }
        },
        {
            command: 
            {
                command: "test_service",
                description: "Test service",
            },
            handler: new TestService()
        },
        {
            command: {
                command: "example",
                description: "run example trade pattern",
            },
            handler: async function(ctx: BaseUIContext) {
                await ctx.reply("Impl removed.")
            }
        },
        {
            command: {
                command: pumpFunRobot_CommandName,
                description: pumpServiceDescription,
                args: pumpServiceArgs
            },
            handler: new PumpFunRobot()
        }

    ]
}

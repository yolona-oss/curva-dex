import { BaseUIContext } from "@core/ui"
import { ICmdRegisterManyEntry } from "@core/ui/cmd-traspiler"

import { TestService } from "./user-services"
//import { PumpFunService, PFName, PFDescription } from './pump.fun.service'
import { SingleThrottler } from "@core/utils/single-throttler"
import { CmdArgument } from "@core/ui/types/command"

class AksArgs {
    @CmdArgument({
        required: false,
        position: null,
        pairOptions: ["misterial"],
        defaultValue: "misterial",
        validator: () => true,
        description: "AI name"
    })
    ai?: string

    @CmdArgument({
        required: true,
        position: 1,
        description: "Message to ask"
    })
    message?: string
}

export function InitializeUserCommands<Ctx extends BaseUIContext>(): ICmdRegisterManyEntry<Ctx> {
    return [
        {
            command: {
                command: "check_seq_1",
                description: "Check sequence first",
                next: ["check_seq_2"]
            },
            mixin: async function(_: any, ctx: BaseUIContext) {
                await ctx.reply("now you can call cmd: /check_seq_2")
            }
        },
        {
            command: {
                command: "check_seq_2",
                description: "Check sequence cmd",
                prev: "check_seq_1"
            },
            mixin: async function(_: any, ctx: BaseUIContext) {
                await ctx.reply("check_seq_2 success")
            }
        },
        {
            command: {
                command: "ask",
                description: "Ask something from AI",
                args: new AksArgs()
            },
            mixin: async function(args: string[], ctx: BaseUIContext) {
                console.log(args)
                let aiName = args[0]
                const avaliableAis = [ "misterial" ]
                let msg
                if (aiName) {
                    if (!avaliableAis.includes(aiName)) {
                        ctx.reply(`AI "${aiName}" not found`)
                        return
                    }
                    msg = args.slice(1).join(" ")
                } else {
                    aiName = "misterial"
                    msg = args.join(" ")
                }
                await ctx.reply(`${aiName} AI selected`)

                if (!msg) {
                    await ctx.reply("Please provide a message")
                    return
                }

                const answer = await SingleThrottler.Instance.throttle<string>("ask", async () => {
                    let api_all = {
                        misterial: {
                            url: 'https://api.mistral.ai/v1/chat/completions',
                            key: process.env[`AI_API_KEY_MISTERAL`]
                        }
                    }
                    const api = api_all[aiName as keyof typeof api_all]
                    console.log(api)
                    const res = await fetch(api.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${api.key}`,
                        },
                        body: JSON.stringify({
                            "model": "mistral-small-latest",
                            "messages": [
                                {
                                    "role": "user",
                                    "content": msg
                                }
                            ],
                            "response_format": 
                            {
                                "type": "text"
                            }
                        })
                    })
                    const json = await res.json()
                    return json.choices[0].message.content
                })
                await ctx.reply(answer)
            }
        },
        {
            command: 
            {
                command: "test_service",
                description: "Test service",
            },
            mixin: new TestService()
        },
        //{
        //    command: {
        //        command: PFName,
        //        description: PFDescription,
        //    },
        //    mixin: new PumpFunService()
        //}

    ]
}

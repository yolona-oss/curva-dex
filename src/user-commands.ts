import { BaseUIContext } from "@core/ui"
import { ICmdRegisterManyEntry } from "@core/ui/command-processor"

import { TestService } from "./user-services"
import { PumpFunService, PFName, PFDescription } from './pump.fun.service'
import { SingleThrottler } from "@core/utils/single-throttler"
import { CmdArgument } from "@core/ui/types/command"
import log from "@core/application/logger"

class AksArgs {
    @CmdArgument({
        required: false,
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
            invokable: async function(_: any, ctx: BaseUIContext) {
                await ctx.reply("now you can call cmd: /check_seq_2")
            }
        },
        {
            command: {
                command: "check_seq_2",
                description: "Check sequence cmd",
                prev: "check_seq_1"
            },
            invokable: async function(_: any, ctx: BaseUIContext) {
                await ctx.reply("check_seq_2 success")
            }
        },
        {
            command: {
                command: "ask",
                description: "Ask something from AI",
                args: new AksArgs()
            },
            invokable: async function(args, ctx: BaseUIContext) {
                log.trace(args)
                let aiName = args.get('ai')
                const avaliableAis = [ "misterial" ]
                const msg = args.getOrThrow('message')
                if (aiName) {
                    if (!avaliableAis.includes(aiName)) {
                        ctx.reply(`AI "${aiName}" not found`)
                        return
                    }
                } else {
                    aiName = "misterial"
                }
                await ctx.reply(`${aiName} AI selected`)

                const answer = await SingleThrottler.Instance.throttle<string>("ask", async () => {
                    let api_all = {
                        misterial: {
                            url: 'https://api.mistral.ai/v1/chat/completions',
                            key: process.env[`AI_API_KEY_MISTERIAL`]
                        }
                    }
                    const api = api_all[aiName as keyof typeof api_all]
                    const res = await fetch(api.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type':  'application/json',
                            'Authorization': `Bearer ${api.key}`,
                        },
                        body: JSON.stringify({
                            "model": "mistral-small-latest",
                            "messages": [ { "role": "user", "content": msg } ],
                            "response_format": { "type": "text" }
                        })
                    })
                    const json = await res.json()
                    if (json.ok != undefined && !json.ok) {
                        return json.error ?? json.statusText
                    }
                    const ret = json.choices.map((choice: any) => choice.message.content).join('\n')
                    return ret
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
            invokable: new TestService()
        },
        {
            command: {
                command: PFName,
                description: PFDescription,
            },
            invokable: new PumpFunService()
        }

    ]
}

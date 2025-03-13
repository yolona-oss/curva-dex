import { CmdArgmuentKeyHolder } from './meta'

/**
 * @description Command argument definition
 *
 * use this notation: 
 * class CommandEchoArgs {
 *     @CmdArgument({
 *         required: true,
 *         description: "Message to echo",
 *     })
 *     echo?: string
 * }
 *
 * const EchoCommand = {
 *      command: 'echo',
 *      args: new CommandEchoArgs
 *      exec: async function(args: ..., ctx: UIContext) {
 *          ctx.reply(args.echo)
 *      }
 * }
 */
export type ICmdArgumentDefenition = CmdArgmuentKeyHolder

export * from './descriptor'
export * from './context'
export * from './option'
export * from './meta'

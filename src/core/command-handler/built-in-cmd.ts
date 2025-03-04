import { BuiltInAccountCommandsEnum, BuiltInHelpCommandsEnum, BuiltInSeqCommandsEnum, BuiltInServiceCommandsEnum } from "./constants/built-in-cmd-enum";
import { IUICommandSimple } from "@core/ui";

export const BuiltInUICmdArray: Array<IUICommandSimple> = new Array<IUICommandSimple>()
    .concat([
        {
            command: BuiltInSeqCommandsEnum.NEXT_COMMAND,
            description: "Proceed in current command sequnce.",
            args: []
        },
        {
            command: BuiltInSeqCommandsEnum.BACK_COMMAND,
            description: "Go back in current command sequnce.",
            args: []
        },
        {
            command: BuiltInSeqCommandsEnum.CANCEL_COMMAND,
            description: "Cancel current command sequnce.",
            args: []
        }
    ])
    .concat([
        {
            command: BuiltInServiceCommandsEnum.STOP_COMMAND,
            description: "Stop service with passed name <service-name>.",
            args: [
                {
                    name: "service-name",
                    optional: false,
                    optType: "none",
                    description: "Service name",
                    options: (handler, owner) => {
                        return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
                    }
                }
            ]
        },
        {
            command: BuiltInServiceCommandsEnum.SEND_MSG_COMMAND,
            description: "Send message to service with passed name <service-name> and <message> with optional args.",
            args: [
                {
                    name: "service-name",
                    optional: false,
                    optType: "none",
                    description: "Service name",
                    options: (handler, owner) => {
                        return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
                    }
                },
                {
                    name: "message",
                    optional: false,
                    optType: "none",
                    description: "Message",
                    options: []
                },
                {
                    name: "args",
                    optional: true,
                    optType: "none",
                    description: "Message args",
                    options: []
                }
            ]
        }
    ])
    .concat([
        {
            command: BuiltInAccountCommandsEnum.SET_VARIABLE,
            description: "Create or update variable for user execution context",
            args: [
                {
                    name: "service",
                    optional: false,
                    optType: "none",
                    description: "Service name",
                    options: (handler, owner) => {
                        return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
                    }
                },
                {
                    name: "path",
                    optional: false,
                    optType: "none",
                    description: "Variable path",
                    options: []
                },
                {
                    name: "value",
                    optional: false,
                    optType: "none",
                    description: "Variable value",
                    options: []
                }
            ]
        },
        {
            command: BuiltInAccountCommandsEnum.REMOVE_VARIABLE,
            description: "Remove variable for user execution context",
            args: [
                {
                    name: "service",
                    optional: false,
                    optType: "none",
                    description: "Service name",
                    options: (handler, owner) => {
                        return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
                    }
                },
                {
                    name: "path",
                    optional: false,
                    optType: "none",
                    description: "Variable path",
                    options: []
                }
            ]
        },
        {
            command: BuiltInAccountCommandsEnum.GET_VARIABLE,
            description: "Get variable for user execution context",
            args: [
                {
                    name: "service",
                    optional: false,
                    optType: "none",
                    description: "Service name",
                    options: (handler, owner) => {
                        return handler.ActiveServices.get(String(owner.userId))?.map(s => s.name) ?? []
                    }
                },
                {
                    name: "path",
                    optional: false,
                    optType: "none",
                    description: "Variable path",
                    options: []
                }
            ]
        }
    ])
    .concat([
        {
            command: BuiltInHelpCommandsEnum.HELP_COMMAND,
            description: "List all available commands.",
            args: []
        },
        {
            command: BuiltInHelpCommandsEnum.CHELP_COMMAND,
            description: "Print help for concreet command",
            args: [
                {
                    name: "command",
                    optional: false,
                    optType: "none",
                    description: "Command name",
                    options: (handler) => {
                        return handler.mapHandlersToUICommands().map(c => c.command)
                    }
                }
            ]
        }
    ]) as Array<IUICommandSimple>

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
        args: ["service-name"]
    },
    {
        command: BuiltInServiceCommandsEnum.SEND_MSG_COMMAND,
        description: "Send message to service with passed name <service-name> and <message> with optional args.",
        args: ["service-name", "message", "?args"]
    }
])
.concat([
    {
        command: BuiltInAccountCommandsEnum.SET_VARIABLE,
        description: "Create or update variable for user execution context",
        args: ["service", "path", "value"]
    },
    {
        command: BuiltInAccountCommandsEnum.REMOVE_VARIABLE,
        description: "Remove variable for user execution context",
        args: ["service", "path"]
    },
    {
        command: BuiltInAccountCommandsEnum.GET_VARIABLE,
        description: "Get variable for user execution context",
        args: ["service", "path"]
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
        args: ["command"]
    }
]) as Array<IUICommandSimple>

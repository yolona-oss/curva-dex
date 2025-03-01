import { DefaultAccountCommandsEnum, DefaultHelpCommandsEnum, DefaultSeqCommandsEnum, DefaultServiceCommandsEnum } from "@core/constants";
import { IUICommandSimple } from "@core/ui";

export const DefaultCommandsMap: Array<IUICommandSimple> = new Array<IUICommandSimple>()
.concat([
    {
        command: DefaultSeqCommandsEnum.NEXT_COMMAND,
        description: "Proceed in current command sequnce.",
        args: []
    },
    {
        command: DefaultSeqCommandsEnum.BACK_COMMAND,
        description: "Go back in current command sequnce.",
        args: []
    },
    {
        command: DefaultSeqCommandsEnum.CANCEL_COMMAND,
        description: "Cancel current command sequnce.",
        args: []
    }
])
.concat([
    {
        command: DefaultServiceCommandsEnum.STOP_COMMAND,
        description: "Stop service with passed name <service-name>.",
        args: ["service-name"]
    },
    {
        command: DefaultServiceCommandsEnum.SEND_MSG_COMMAND,
        description: "Send message to service with passed name <service-name> and <message> with optional args.",
        args: ["service-name", "message", "?args"]
    }
])
.concat([
    {
        command: DefaultAccountCommandsEnum.SET_VARIABLE,
        description: "Create or update variable for user execution context",
        args: ["service", "path", "value"]
    },
    {
        command: DefaultAccountCommandsEnum.REMOVE_VARIABLE,
        description: "Remove variable for user execution context",
        args: ["service", "path"]
    },
    {
        command: DefaultAccountCommandsEnum.GET_VARIABLE,
        description: "Get variable for user execution context",
        args: ["service", "path"]
    }
])
.concat([
    {
        command: DefaultHelpCommandsEnum.HELP_COMMAND,
        description: "List all available commands.",
        args: []
    },
    {
        command: DefaultHelpCommandsEnum.CHELP_COMMAND,
        description: "Print help for concreet command",
        args: ["command"]
    }
]) as Array<IUICommandSimple>

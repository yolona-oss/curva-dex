import { CmdArgument, COMMAND_ARG_DESC_KEY, getCmdArgMetadata } from "@core/ui/types/command";

@CmdArgument({
    required: false,
    standalone: false,
    pairOptions: ["1", "2", "off"],
    defaultValue: "1",
    validator: () => true,
    description: "Session id to restore state from."
})

let args = {
    a: Number,
    b: String,
    ArgUndef: null,
}

function attachMetadata(obj: Record<string, any>, propertyKey: string, metadata: any) {
    Reflect.defineMetadata(COMMAND_ARG_DESC_KEY, metadata, obj, propertyKey);
}

attachMetadata(args,
    "a",
    { required: false, standalone: false, pairOptions: ["1", "2", "off"], defaultValue: "1", validator: () => true, description: "Session id to restore state from." }
)

const res = getCmdArgMetadata(args)

console.log(res)

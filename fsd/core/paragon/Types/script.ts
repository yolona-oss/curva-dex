import { any, record, assign, union, optional, array, enums, Infer, boolean, object, number, string } from 'superstruct'

export const scriptActionNextSign = union([number(), string()])

// extendable by cmd plugins inputs parameter
// TODO add profile schema
export const scriptActionSign = union([
    object({
        // access
        id: number(),
        // for logging
        description: optional(string()),
        // entry point
        entryPoint: optional(boolean()),
        // next action or procedure if conditional undefined
        next: optional(scriptActionNextSign),
        command: string(), // command to be executed
        conditional: optional(
            // if else emulation.
            // next action will be executed on first TRUE return from checkFn
            // checkFn - string to one of plugged in check functions
            // full execution process will be terminated if no one will return TRUE
            array(
                // extendable for custom inputs
                assign(
                    object({
                        checkFn: string(),
                        next: scriptActionNextSign
                    }),
                    object({})
                )
            )
        )
    }),
    any()
])

// procedure name: actions array
// actions id must be not intercept other ids
export const scriptProcedureSign = record(string(), array(scriptActionSign))

// AdsPower - will be use an running AdsPower API instance to open browser and pass control to paragon
// Common - will open preinstalled chroium browser instance or browser passed in script
// Stealth - will open an Common instance but use stealth pluggin
export const scriptBrowserAdaptersSign = enums([ "AdsPower", "Common", "Stealth" ])

export const scriptSign = object({
    // identifier to assign to
    name: string(),

    // timeout trigger
    maxExecutionTime: number(),

    // reusable procedures, identified by name
    procedures: scriptProcedureSign,

    // script actions
    actions: array(scriptActionSign),

    // finally procedure
    finally: optional(string()),
})

export type script = Infer<typeof scriptSign>;
export type scriptAction = Infer<typeof scriptActionSign>;

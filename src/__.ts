import 'reflect-metadata';

const ARG_METADATA_KEY = Symbol('argMetadata');

function ArgMetadata(metadata: any) {
    return function (target: any, propertyKey: string) {
        Reflect.defineMetadata(ARG_METADATA_KEY, metadata, target, propertyKey);
    };
}

class BaseServiceParameters {
    @ArgMetadata({
        required: false,
        standalone: false,
        options: ["sdff", "ff"],
        defaultValue: "4321",
        validator: () => true,
        description: "Session id to restore state from."
    })
    sessionId?: string;

    @ArgMetadata({
        required: false,
        standalone: false,
        options: ["123", "sdff", "ff"],
        defaultValue: "1234",
        validator: () => true,
        description: "Session id to restore state from."
    })
    s?: string;
}

class TestServiceInteractMessages extends BaseServiceParameters {
    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Pause service",
    })
    pause?: boolean;

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Resume service",
    })
    resume?: boolean;

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Stop service",
    })
    stop?: boolean;

    @ArgMetadata({
        required: false,
        standalone: true,
        description: "Reset service",
    })
    reset?: boolean;

    @ArgMetadata({
        required: false,
        standalone: false,
        description: "Set max value",
    })
    setmax?: number;
}

function getOptionsMap(target: any): Record<string, any> {
    const optionsMap: Record<string, any> = {};

    let currentTarget = target;
    while (currentTarget !== null && currentTarget !== Object.prototype) {
        const propertyKeys = Object.getOwnPropertyNames(currentTarget);

        propertyKeys.forEach((propertyKey) => {
            if (propertyKey === 'constructor' || typeof currentTarget[propertyKey] === 'function') {
                return;
            }

            const metadata = Reflect.getMetadata(ARG_METADATA_KEY, currentTarget, propertyKey);
            if (metadata && !optionsMap[propertyKey]) {
                optionsMap[propertyKey] = metadata;
            }
        });

        currentTarget = Object.getPrototypeOf(currentTarget);
    }

    return optionsMap;
}

class A {
    protected param: BaseServiceParameters

    constructor(param: BaseServiceParameters) {
        this.param = param
    }

    public methodC() {
        const optionsMap = getOptionsMap(this.param);
        console.log(optionsMap);
    }
}

class B extends A {
    constructor() {
        super(new TestServiceInteractMessages());
    }
}

// Usage
const instanceB = new B();
instanceB.methodC(); // Logs options map for TestServiceInteractMessages

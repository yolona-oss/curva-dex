# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is an npm workspaces monorepo with two packages:

- **`packages/cmd-hub/`** (`@cmd-hub/core`) — Reusable SDK: UI framework, command processor, service base classes, DB abstractions, utilities
- **`packages/curva-dex/`** (`curva-dex`) — Application: trading bot, pump.fun service, user commands

The SDK has zero imports from the app. Blockchain-specific code (Solana providers, blockchain utils) lives in the app package.

## Build & Run Commands

```bash
npm run build          # Build all packages
npm run build:sdk      # Build SDK only
npm run build:app      # Build app only
npm run start:ts       # Run app with ts-node (uses SWC)
```

No test runner or linter is configured.

## TypeScript Path Aliases

**SDK (`packages/cmd-hub/tsconfig.json`):**

| Alias | Path |
|-------|------|
| `@core/*` | `./src/*` |
| `@logger` | `./src/application/logger` |
| `@config` | `./src/config` |
| `@utils/*` | `./src/utils/*` |

**App (`packages/curva-dex/tsconfig.json`):**

| Alias | Path |
|-------|------|
| `@core/*` | `../cmd-hub/src/*` (SDK) |
| `@core/providers/*` | `./src/providers/*` (local override) |
| `@utils/blockchain/*` | `./src/utils/blockchain/*` (local override) |
| `@bots/*` | `./src/bots/*` |
| `@logger` | `../cmd-hub/src/application/logger` |
| `@config` | `./src/config` (local, re-exports SDK config) |

More-specific path aliases override `@core/*` to keep blockchain code app-local.

Strict mode and decorators (`experimentalDecorators`, `emitDecoratorMetadata`) are enabled.

## SDK Architecture (`packages/cmd-hub/`)

### Plugin-Extensible UI System

UIs extend `BaseUI<CtxType>` which manages plugins via `use(plugin)`. Plugin hooks intercept message send/edit/delete, command dispatch (before/after), and lifecycle events.

- **`IUIPlugin<CtxType>`** — base plugin interface (message interceptors, command interceptors, lifecycle hooks)
- **`ITelegramPlugin`** — extends IUIPlugin with `setupMiddleware()`, `setupActions()`, `setupCommands()` for raw telegraf access
- **`ICLIPlugin`** — extends IUIPlugin with `extendCompletions()`, `onRawInput()`
- **`UIRegistry`** — factory registry for creating UIs by name. Built-in: `"telegram"`, `"cli"`. Third parties register via `UIRegistry.register(name, factory)`

TelegramUI plugin pipeline order: auth → plugin middleware → history save → commands → plugin commands → actions → plugin actions → bot.launch()

### Command Processing (`src/ui/command-processor/`)

Chain of Responsibility: `CommandAlias → CmdBuilder → SequenceCommand → Invokation`

`CmdDispatcher<UIContextType>` maintains the command registry and active services per user. Arguments are metadata-driven via `@CmdArgument({...})` decorators, compiled into `CmdArgumentProxy`.

### Commands vs Services

- **`ICmdFunction<Ctx>`** — stateless, one-shot
- **`BaseCommandService<ServiceDataType>`** — stateful, long-running with lifecycle: `Initialize() → run() → receiveMsg() → terminate()`. Emits `message`, `error`, `done` events. Session data persisted to MongoDB.

### AppCmdhub

`AppCmdhub` accepts an `IUI` instance (constructed by the app with plugins configured). It manages application lifecycle: MongoDB connection, lock files, signals, banner.

### Database (`src/db/`)

MongoDB with Mongoose. Schema chain: `Manager (userId) → Account → AccountModule (service config) → AccountSession (session data)`. All schemas are generic — services store arbitrary JSON in the `data` field.

### Configuration (`src/config.ts`)

Validated with `superstruct`. Loaded from `config.json`. Contains bot token, MongoDB URI, server settings, log level. Exports `ConfigSign`, `ConfigType`, `getConfig()`, `getInitialConfig()`.

## App Architecture (`packages/curva-dex/`)

### Bootstrap Flow (`src/index.ts`)

1. `ImplRegistrySetup()` — registers trade implementations (pump.fun)
2. `CmdDispatcher<TgContext>` — initializes command routing
3. User commands/services registered via `registerMany()`
4. `TelegramUI` constructed with bot token and dispatcher
5. `AppCmdhub(ui)` — starts the application

### Trading Bot (`src/bots/traider/`)

Generic trade architecture with pluggable DEX implementations via `TradeArchImplRegistry`.

- **MTC (Master Trader Controller)** — orchestrates slave traders, manages curves, order sequencing via `Sequalizer`
- **STC (Slave Trader Controller)** — individual trading agent with balance tracking and metrics
- **Wallet Manager** — abstract `BaseWalletManager`, concrete `SolanaWalletManager`

### pump.fun Service (`src/pump.fun.service/`)

`PumpFunService` extends `BaseCommandService` → creates `PumpFunRobot` (state machine). API implementation selected via `InUseApiImpl` constant.

## Key Patterns

- **Plugin System**: `BaseUI.use(plugin)` with hook-based interceptors for messages and commands
- **Chain of Responsibility**: Command processing handler chain
- **Observer**: `Subject<T>` / `Observer<T>`, typed event emitters throughout services
- **Template Method**: `BaseCommandService` defines lifecycle, subclasses implement `runWrapper()` / `terminateWrapper()`
- **Registry/Factory**: `TradeArchImplRegistry` for DEX impls, `UIRegistry` for UI impls

## Tech Stack

- **Runtime**: Node.js + TypeScript (ESNext target, CommonJS modules)
- **Bot**: telegraf (Telegram Bot API)
- **Blockchain**: @solana/web3.js, @solana/spl-token, @coral-xyz/anchor (app only)
- **Database**: mongoose (MongoDB)
- **Validation**: superstruct
- **Build**: tsc, ts-node with SWC transpiler

- get GF
- rename all log commands accordingly its significance to logging levels
- create live log: just html + js that poll from server / send empty msg and endit it with log updates
+ integrate user context state value to set availability to execute concreet commands
- create associative mongo collection for handling default images
+ add capability to use any value in next message by setting UICommand.next some e.g. __STRING_ALIKE__, __NUMBER_ALIKE__, __BOOLEAN_ALIKE__, __ARRAY_ALIKE__ for primitives and also __VIDEO_ALIKE__, __IMAGE_ALIKE__, __AUDIO_ALIKE__ for media
- !(will not implemented due another way selectd) add account modules linking for nesting configs
+- add command handler capability to use interactive command arguments pass with sequence handler by adding new field to command: UICommand.interactive = true
+ add all recived signs from fronted-pump.fun-api websocket add listners to check tx finalization and remove from all tx destinations by some signal

+ create modules
+ sort files to isolated folders that dont call other not @core or adk dependency and create plugins folder to store all code extensions
- add cap to check needed modules deps initialization in CmdHubApplication (like TradeArchImplRegistry trade implementation registration)

+ create data saves by executor more centralized!!
+ in mtc / stc ... etc that subscribes to events or will saving files depend on global vars and checks for its id equals to blank to do not save data or subscribe. its need to modification for unified assigning to blank behavior

- deep refactor pump.fun impl api folder

- create command aliasing

+ create command service param and msg type injection with reflection|decorators

- create classes for more OCP assess to db schemes

- create singleton to manage piping building command option selection. and ...

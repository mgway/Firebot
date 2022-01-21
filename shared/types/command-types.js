"use strict";

const effectTypes = require("./effect-types"); // eslint-disable-line no-unused-vars

/**
 * @typedef Cooldown
 * @prop {number} global - the cooldown for all users
 * @prop {number} user - the cooldown per user
 */

/**
 * @typedef RestrictionData
 * @prop {any[]} restrictions - the array of restrictions objects
 * @prop {string} mode - whether all, any or no restrictions should pass
 * @prop {boolean} [sendFailMessage] - whether a chat message should be sent when the command user is restricted
 * @prop {string} [failMessage] - the chat message that is sent when the command user is restricted
 */

/**
 * @typedef SystemCommandOptions
 * @prop {string} type - the type of the command option
 * @prop {string} title - the title of the command option
 * @prop {string} [description] - the description of the command option
 * @prop {string} [tip] - the tips for how to use the command option
 * @prop {any} default - the default value of the command option
 * @prop {boolean} [useTextArea] - whether a text area should be used for the command option
 * @prop {any} value - the value of the command option
 */

/**
 * @typedef SubCommandDefinition
 * @prop {string} arg - the argument used to trigger the subcommand
 * @prop {string} usage - how the subcommand should be used
 * @prop {string} description - the description of the subcommand
 * @prop {number} [minArgs] - the minimum args that should be used
 * @prop {RestrictionData} restrictionData - the saved restrictions for the subcommand
 * @prop {boolean} [active] - whether the subcommand is enabled
 * @prop {boolean} [autoDeleteTrigger] - whether the trigger chat message should be deleted automatically
 * @prop {boolean} [hidden] - whether the subcommand is hidden on the commands list
 * @prop {Cooldown} [cooldown] - the cooldown settings for the subcommand
 */

/**
 * @typedef SubCommandDefinitionCustom
 * @prop {string} id - the id of the subcommand
 * @prop {string} type - the type of the subcommand
 * @prop {boolean} regex - whether the subcommand is a regex
 * @prop {boolean} fallback - whether a fallback is active
 * @prop {effectTypes.Effects} effects - the effects for the subcommand
 */

/**
 * @typedef {SubCommand & SubCommandDefinitionCustom} CustomSubCommandDefinition
 */

/**
 * @typedef CommandDefinition
 * @prop {string} id - the id of the command
 *
 * @prop {string} trigger - the trigger of the command
 * @prop {boolean} autoDeleteTrigger - whether the trigger chat message should be deleted automatically
 * @prop {boolean} scanWholeMessage - whether the whole chat message should be scanned for the command
 *
 * @prop {Cooldown} cooldown - the cooldown settings for the command
 * @prop {RestrictionData} [restrictionData] - the saved restrictions for the command
 *
 * @prop {boolean} active - whether the command is enabled
 * @prop {boolean} hidden - whether the command is hidden on the commands list
 *
 * @prop {import("./effect-types").Effects} [effects] - the saved effects in the command
 *
 * @prop {CustomCommandSubCommand[]} [subCommands] - the subcommands that belong to the command
 */

/**
 * @typedef SystemCommandDefinition
 * @prop {string} name - the name of command
 * @prop {string} description - the description of the command
 * @prop {"system" | "custom"} type - the type of the command
 * @prop {boolean} [hideCooldowns]
 * @prop {SystemCommandOptions} [options]
 */

/**
 * @typedef CustomCommandDefinition
 * @prop {"system" | "custom"} [type] - the type of the command
 * @prop {string} [description] - the description of the command
 * @prop {boolean} simple - whether this command was created in simple mode
 * @prop {string[]} aliases - a list of triggers that should also trigger this command
 *
 * @prop {boolean} [triggerIsRegex] - whether the command trigger is a regular expression
 * @prop {string} [regexDescription] - the human readable description of the regular expression
 *
 * @prop {string} createdBy - the user who created the command
 * @prop {Date} createdAt - when the command was created
 * @prop {string} [lastEditBy] - the user who last edited the command
 * @prop {Date} [lastEditAt] - when the command was last edited
 *
 * @prop {number} count - how many times the command has been used
 *
 * @prop {boolean} ignoreBot - Whether the command should trigger if the bot account uses it
 * @prop {boolean} [ignoreStreamer] - whether the command should trigger if the streamer account uses it
 *
 * @prop {string[]} sortTags - the sort tags for the effect list
 */

exports.unused = {};
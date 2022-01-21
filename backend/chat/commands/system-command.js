"use strict";

const systemCommandManager = require("./system-command-manager");

/**
 * @typedef {import("../../../shared/types/command-types").CommandDefinition &
 * import("../../../shared/types/command-types").SystemCommandDefinition
 * } SystemCommandDefinition
 */
/** @typedef {import("../../../shared/types/command-types").SystemCommandOptions} SystemCommandOptions */
/** @typedef {import("../chat-helpers").FirebotChatMessage} FirebotChatMessage */

/**
 * @typedef UserCommand
 * @prop {string} trigger
 * @prop {string[]} args
 * @prop {string | null} triggeredArg
 * @prop {string | null} subCommandId
 * @prop {string} commandSender
 * @prop {string[]} [senderRoles]
 */

/**
 * @typedef CommandEvent
 * @prop {SystemCommandDefinition} command
 * @prop {SystemCommandOptions} commandOptions
 * @prop {UserCommand} userCommand
 * @prop {FirebotChatMessage} chatMessage
 */

class SystemCommand {
    /**
     * @param {SystemCommandDefinition} definition
     * @param {boolean} registeredByDefault - Set this to false if a manager registers the command instead of the command loader
     * */
    constructor(definition, registeredByDefault = true) {
        if (this.constructor === SystemCommand) {
            throw new Error("Cannot instantiate SystemCommand, please extend it.");
        }

        this.definition = definition;
        this.registeredByDefault = registeredByDefault;
    }

    /**
     * What should happen when the command is triggered.
     *
     * @abstract
    */
    async onTriggerEvent() {
        throw new Error("Please implement this method.");
    }

    register() {
        if (!systemCommandManager.hasSystemCommand(this.definition.id)) {
            systemCommandManager.registerSystemCommand(this);
        }
    }

    unregister() {
        systemCommandManager.unregisterSystemCommand(this.definition.id);
    }
}

module.exports = SystemCommand;
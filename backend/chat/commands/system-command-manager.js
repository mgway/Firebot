"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const JsonDbManager = require("../../database/json-db-manager");
const logger = require("../logwrapper");
const systemCommandDefinitionLoader = require("./system-command-loader");

/**
 * @typedef SystemCommand
 * @prop {string} id - the id of the effect list
 * @prop {string} name - the name of the effect list
 * @prop {object[]} args - the arguments of the effect list
 * @prop {object} effects - the saved effects in the list
 * @prop {string} effects.id - the effect list root id
 * @prop {any[]} effects.list - the array of effects objects
 * @prop {string[]} sortTags - the sort tags for the effect list
 */

/**
 * @hideconstructor
 * @extends {JsonDbManager<SystemCommand>}
 * {@link JsonDbManager}
 */
class SystemCommandManager extends JsonDbManager {
    constructor() {
        super("System Command", "/chat/commands", "/systemCommandOverrides");

        this.systemCommandDefinitions = new Map();
    }

    loadItems() {
        // First load the overrides
        super.loadItems();

        // Then get the definitions
        systemCommandDefinitionLoader.loadCommands();
    }

    registerSystemCommand(command) {
        let override = { ...this.items[command.definition.id] };

        if (override == null) {
            this.items[command.definition.id] = command;
            return;
        }

        override.options = {
            ...command.definition.options,
            ...override.options
        };

        if (!command.definition.subCommands || !command.definition.subCommands.length) {
            override.subCommands = [];
        } else {
            override.subCommands = override.subCommands.map(osc => {
                if (command.definition.subCommands.includes(osc)) {
                    return osc;
                }
            });

            override.subCommands = command.definition.subCommands.map(dsc => {
                if (!override.subCommands.includes(dsc)) {
                    return dsc;
                }
            });
        }

        this.items[override.id] = {
            ...command,
            ...override
        };

        // Keep a collection of the command definitions for CommandManager.js
        this.systemCommandDefinitions.set(command.id, command);

        logger.debug(`Registered System Command ${command.override.id}`);
    }

    unregisterSystemCommand(id) {
        this.items = this.items.filter(c => c.id !== id);
        logger.debug(`Unregistered System Command ${id}`);
    }

    hasSystemCommand(id) {
        return this.items.some(c => c.id === id);
    }

    getSystemCommandTrigger(id) {
        return this.items[id].trigger || null;
    }

    getSystemCommandDefinitionById(id) {
        return this.systemCommandDefinitions.get(id);
    }

    getSystemCommandDefinitions() {
        return Array.from(this.registeredSystemCommands.values());
    }

    saveSystemCommandDefinition(commandDefinition) {
        this.systemCommandDefinitions.set(commandDefinition.definition.id, commandDefinition);
    }

    /**
     * @returns {void}
     */
    triggerUiRefresh() {
        frontendCommunicator.send("all-system-commands", this.getAllItems());
    }
}

const systemCommandManager = new SystemCommandManager();

frontendCommunicator.onAsync("getSystemCommands",
    async () => systemCommandManager.getAllItems());

frontendCommunicator.onAsync("saveSystemCommand",
    async (/** @type {SystemCommand} */ systemCommand) => systemCommandManager.saveItem(systemCommand));

frontendCommunicator.onAsync("saveAllSystemCommands",
    async (/** @type {SystemCommand[]} */ allSystemCommands) => systemCommandManager.saveAllItems(allSystemCommands));

frontendCommunicator.on("deleteSystemCommand",
    (/** @type {string} */ systemCommandId) => systemCommandManager.deleteItem(systemCommandId));

module.exports = systemCommandManager;

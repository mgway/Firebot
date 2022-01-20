"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const JsonDbManager = require("../../database/json-db-manager");
const logger = require("../../logwrapper");
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

        this.allSystemCommands = {};
        this.defaultCommandDefinitions = {};
        this.commandEventDefinitions = {};
    }

    /**
     * @override
     */
    loadItems() {
        // First load the overrides
        super.loadItems();

        // Then get the definitions
        systemCommandDefinitionLoader.loadCommands();
    }

    /**
     * @override
     */
    getAllItems() {
        return Object.values(this.allSystemCommands);
    }

    saveItem(commandDefinition) {
        super.saveItem(commandDefinition);
        this.allSystemCommands[commandDefinition.id].definition = commandDefinition;

        return commandDefinition;
    }

    deleteItem(commandId) {
        super.deleteItem(commandId);

        this.allSystemCommands[commandId].definition = this.defaultCommandDefinitions[commandId];
        this.triggerUiRefresh();
    }

    registerSystemCommand(command) {
        const defaultDefinition = command.definition;
        this.defaultCommandDefinitions[defaultDefinition.id] = defaultDefinition;

        const override = this.items[defaultDefinition.id];
        if (override == null) {
            logger.debug(`Registered System Command ${defaultDefinition.id} without override`);
            this.allSystemCommands[defaultDefinition.id] = command;
            return;
        }

        override.options = {
            ...defaultDefinition.options,
            ...override.options
        };

        if (!defaultDefinition.subCommands || !defaultDefinition.subCommands.length) {
            override.subCommands = [];
        } else if (!override.subCommands || !override.subCommands.length) {
            override.subCommands = defaultDefinition.subCommands;
        } else {
            override.subCommands = override.subCommands.map(osc => {
                if (defaultDefinition.subCommands.includes(osc)) {
                    return osc;
                }
            });

            override.subCommands = defaultDefinition.subCommands.map(dsc => {
                if (!override.subCommands.includes(dsc)) {
                    return dsc;
                }
            });
        }

        this.allSystemCommands[override.id] = {
            definition: {
                ...defaultDefinition,
                ...override
            },
            onTriggerEvent: command.onTriggerEvent
        };


        logger.debug(`Registered System Command ${defaultDefinition.id} with override`);
        this.triggerUiRefresh();
    }

    unregisterSystemCommand(id) {
        delete this.allSystemCommands[id];
        logger.debug(`Unregistered System Command ${id}`);
        this.triggerUiRefresh();
    }

    hasSystemCommand(id) {
        return !!this.allSystemCommands[id];
    }

    getSystemCommandTrigger(id) {
        return this.allSystemCommands[id].definition.trigger || null;
    }

    getSystemCommandById(id) {
        return this.allSystemCommands[id];
    }

    getSystemCommandDefinitions() {
        return this.getAllItems().map(c => c.definition);
    }

    saveDefaultSystemCommandDefinition(commandDefinition) {
        this.defaultCommandDefinitions[commandDefinition.id] = commandDefinition;
    }

    /**
     * @returns {void}
     */
    triggerUiRefresh() {
        frontendCommunicator.send("all-system-commands", this.getSystemCommandDefinitions());
    }
}

const systemCommandManager = new SystemCommandManager();

frontendCommunicator.onAsync("getSystemCommands",
    async () => systemCommandManager.getSystemCommandDefinitions());

frontendCommunicator.onAsync("saveSystemCommand",
    async (/** @type {SystemCommand} */ systemCommand) => {
        const savedCommand = systemCommandManager.saveItem(systemCommand);
        return savedCommand.definition;
    });

frontendCommunicator.onAsync("saveAllSystemCommands",
    async (/** @type {SystemCommand[]} */ allSystemCommands) => systemCommandManager.saveAllItems(allSystemCommands));

frontendCommunicator.on("deleteSystemCommand",
    (/** @type {string} */ systemCommandId) => systemCommandManager.deleteItem(systemCommandId));

module.exports = systemCommandManager;

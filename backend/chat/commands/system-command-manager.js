"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const JsonDbManager = require("../../database/json-db-manager");
const logger = require("../../logwrapper");
const systemCommandDefinitionLoader = require("./system-command-loader");

// Used for types
const commandTypes = require("../../../shared/types/command-types"); // eslint-disable-line no-unused-vars

/**
 * @typedef SystemCommand
 * @prop {commandTypes.SystemCommandDefinition[]} definition
 * @prop {function} onTriggerEvent
 * */

/**
 * @hideconstructor
 * @extends {JsonDbManager<commandTypes.SystemCommandDefinition>}
 * {@link JsonDbManager}
 */
class SystemCommandManager extends JsonDbManager {
    constructor() {
        super("System Command", "/chat/commands", "/systemCommandOverrides");

        /** @type {SystemCommand[]} */
        this.allSystemCommands = {};

        /** @type {Object.<string, commandTypes.SystemCommandDefinition>} */
        this.defaultCommandDefinitions = {};
    }

    /**
     * @override
     * @returns {void}
     */
    loadItems() {
        // First load the overrides
        super.loadItems();

        // Then get the definitions
        systemCommandDefinitionLoader.loadCommands();
    }

    /**
     * @override
     * @returns {commandTypes.SystemCommandDefinition[]}
     */
    getAllItems() {
        return Object.values(this.allSystemCommands);
    }

    /**
     * @override
     * @param {commandTypes.SystemCommandDefinition} commandDefinition
     * @returns {commandTypes.SystemCommandDefinition}
     */
    saveItem(commandDefinition) {
        super.saveItem(commandDefinition);
        this.allSystemCommands[commandDefinition.id].definition = commandDefinition;

        return commandDefinition;
    }

    /**
     * @override
     * @param {string} commandId
     * @returns {void}
     */
    deleteItem(commandId) {
        super.deleteItem(commandId);

        this.allSystemCommands[commandId].definition = this.defaultCommandDefinitions[commandId];
        this.triggerUiRefresh();
    }

    /**
     * @param {object} command
     * @returns {void}
     */
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

    /**
     * @param {string} commandId
     * @returns {void}
     */
    unregisterSystemCommand(commandId) {
        delete this.allSystemCommands[commandId];
        logger.debug(`Unregistered System Command ${commandId}`);
        this.triggerUiRefresh();
    }

    /**
     * @param {string} commandId
     * @returns {boolean}
     */
    hasSystemCommand(commandId) {
        return !!this.allSystemCommands[commandId];
    }

    /**
     * @param {string} commandId
     * @returns {string}
     */
    getSystemCommandTrigger(commandId) {
        return this.allSystemCommands[commandId].definition.trigger || null;
    }

    /**
     * @param {string} commandId
     * @returns {SystemCommand}
     */
    getSystemCommandById(id) {
        return this.allSystemCommands[id];
    }

    /**
     * @returns {commandTypes.SystemCommandDefinition}
     */
    getSystemCommandDefinitions() {
        return this.getAllItems().map(c => c.definition);
    }

    /**
     * @param {commandTypes.SystemCommandDefinition} commandDefinition
     * @returns {void}
     */
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
    async (/** @type {commandTypes.SystemCommandDefinition} */ systemCommand) => {
        const savedCommand = systemCommandManager.saveItem(systemCommand);
        return savedCommand.definition;
    });

frontendCommunicator.onAsync("saveAllSystemCommands",
    async (/** @type {commandTypes.SystemCommandDefinition[]} */ allSystemCommands) => systemCommandManager.saveAllItems(allSystemCommands));

frontendCommunicator.on("deleteSystemCommand",
    (/** @type {string} */ systemCommandId) => systemCommandManager.deleteItem(systemCommandId));

module.exports = systemCommandManager;

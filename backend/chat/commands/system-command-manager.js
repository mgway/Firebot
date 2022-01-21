"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const JsonDbManager = require("../../database/json-db-manager");
const logger = require("../../logwrapper");
const systemCommandDefinitionLoader = require("./system-command-loader");

/**
 * @typedef { import("../../../shared/types/command-types").CommandDefinition &
 * import("../../../shared/types/command-types").SystemCommandDefinition
 * } SystemCommandDefinition
 * */

/**
 * @typedef SystemCommand
 * @prop {SystemCommandDefinition[]} definition
 * @prop {function} onTriggerEvent
 * */

/**
 * @hideconstructor
 * @extends {JsonDbManager<SystemCommandDefinition>}
 * {@link JsonDbManager}
 */
class SystemCommandManager extends JsonDbManager {
    constructor() {
        super("System Command", "/chat/commands", "/systemCommandOverrides");

        /** @type {SystemCommand[]} */
        this.allSystemCommands = {};

        /** @type {Object.<string, SystemCommandDefinition>} */
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
     * @returns {SystemCommandDefinition[]}
     */
    getAllItems() {
        return Object.values(this.allSystemCommands);
    }

    /**
     * @override
     * @param {SystemCommandDefinition} commandDefinition
     * @returns {SystemCommandDefinition}
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
    deleteItem(commandId, deleteDefault = false) {
        super.deleteItem(commandId);

        if (deleteDefault) {
            delete this.defaultCommandDefinitions[commandId];
            delete this.allSystemCommands[commandId];
        } else {
            this.allSystemCommands[commandId].definition = this.defaultCommandDefinitions[commandId];
        }

        this.triggerUiRefresh();
    }

    /**
     * @private
     * @param {Object} overrideObject
     * @param {Object} defaultObject
     * @returns {Object}
     */
    _updateOverrideObject(overrideObject, defaultObject) {
        Object.keys(overrideObject).forEach(key => {
            if (defaultObject[key] == null) {
                delete overrideObject[key];
            }
        });

        return {
            ...defaultObject,
            ...overrideObject
        };
    }

    /**
     * @private
     * @param {Array} overrideArray
     * @param {Array} defaultArray
     * @returns {Array}
     */
    _updateOverrideArray(overrideArray, defaultArray) {
        overrideArray = overrideArray.map(item => {
            if (defaultArray.includes(item)) {
                return item;
            }
        });

        overrideArray = defaultArray.map(item => {
            if (!overrideArray.includes(item)) {
                return item;
            }
        });

        return overrideArray;
    }

    /**
     * @param {object} command
     * @returns {void}
     */
    registerSystemCommand(command) {
        const defaultDefinition = command.definition;
        this.defaultCommandDefinitions[defaultDefinition.id] = defaultDefinition;

        let override = this.items[defaultDefinition.id];
        if (override == null) {
            this.allSystemCommands[defaultDefinition.id] = command;

            this.triggerUiRefresh();
            logger.debug(`Registered System Command ${defaultDefinition.id} without override`);

            return;
        }

        override = this._updateOverrideObject(override, defaultDefinition);

        if (override.options != null) {
            override.options = this._updateOverrideObject(override.options, defaultDefinition.options);
        }

        if (override.subCommands && override.subCommands.length) {
            override.subCommands = this._updateOverrideArray(override.subCommands, defaultDefinition.subCommands);
        }

        this.allSystemCommands[override.id] = {
            definition: override,
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
     * @returns {SystemCommandDefinition}
     */
    getSystemCommandDefinitions() {
        return this.getAllItems().map(c => c.definition);
    }

    /**
     * @param {SystemCommandDefinition} commandDefinition
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
    async (/** @type {SystemCommandDefinition} */ systemCommand) => systemCommandManager.saveItem(systemCommand));

frontendCommunicator.onAsync("saveAllSystemCommands",
    async (/** @type {SystemCommandDefinition[]} */ allSystemCommands) => systemCommandManager.saveAllItems(allSystemCommands));

frontendCommunicator.on("deleteSystemCommand",
    (/** @type {string} */ systemCommandId) => systemCommandManager.deleteItem(systemCommandId));

module.exports = systemCommandManager;

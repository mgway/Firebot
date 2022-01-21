"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const JsonDbManager = require("../../database/json-db-manager");
const moment = require("moment");
const commandTypes = require("../../../shared/types/command-types"); // eslint-disable-line no-unused-vars

/**
 * @hideconstructor
 * @extends {JsonDbManager<commandTypes.CustomCommandDefinition>}
 * {@link JsonDbManager}
 */
class CustomCommandManager extends JsonDbManager {
    constructor() {
        super("Custom Command", "/chat/commands", "/customCommands");
    }

    /**
     *
     * @param {CustomCommand} command
     * @param {boolean} imported
     * @returns {Promise.<commandTypes.CustomCommandDefinition>}
     */
    async saveItem(command, user, imported = false) {
        if (command.id == null || command.id === "") {
            command.createdAt = imported ? "Imported" : moment().format();
            command.createdBy = user;
        } else {
            command.lastEditAt = imported ? "Imported" : moment().format();
            command.lastEditBy = user;
        }

        if (command.count == null) {
            command.count = 0;
        }

        const savedCommand = super.saveItem(command);

        if (savedCommand != null) {
            return savedCommand;
        }
    }

    /**
     * @param {string} trigger
     */
    async deleteItemByTrigger(trigger) {
        const command = this.getAllItems().find(c => c.trigger === trigger);

        this.deleteItem(command.id);
    }

    /**
     * @emits
     * @returns {void}
     */
    triggerUiRefresh() {
        frontendCommunicator.send("all-custom-commands", this.getAllItems());
    }
}

const customCommandManager = new CustomCommandManager();

frontendCommunicator.onAsync("getCustomCommands",
    async () => customCommandManager.getAllItems());

frontendCommunicator.onAsync("saveCustomCommand",
    async (/** @type {commandTypes.CustomCommandDefinition} */ {customCommand, user}) => customCommandManager.saveItem(customCommand, user));

frontendCommunicator.onAsync("saveAllCustomCommands",
    async (/** @type {commandTypes.CustomCommandDefinition[]} */ allCustomCommands) => customCommandManager.saveAllItems(allCustomCommands));

frontendCommunicator.on("deleteCustomCommand",
    (/** @type {string} */ customCommandId) => customCommandManager.deleteItem(customCommandId));

module.exports = customCommandManager;

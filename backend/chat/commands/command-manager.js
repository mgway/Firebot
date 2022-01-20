"use strict";

const EventEmitter = require("events");
const customCommandManager = require("./custom-command-manager");
const systemCommandManager = require("./system-command-manager");

class CommandManager extends EventEmitter {
    constructor() {
        super();

        this.CommandType = { SYSTEM: "system", CUSTOM: "custom" };
    }

    registerSystemCommand(command) {
        systemCommandManager.registerSystemCommand(command);
    }

    unregisterSystemCommand(id) {
        systemCommandManager.unregisterSystemCommand(id);
    }

    hasSystemCommand(id) {
        systemCommandManager.hasSystemCommand(id);
    }

    getSystemCommandById(id) {
        return systemCommandManager.getSystemCommandById(id);
    }

    getSystemCommandTrigger(id) {
        return systemCommandManager.getSystemCommandTrigger(id) || null;
    }

    getSystemCommands() {
        return systemCommandManager.getAllItems();
    }

    getAllSystemCommandDefinitions() {
        return systemCommandManager.getSystemCommandDefinitions();
    }

    getCustomCommandById(id) {
        return customCommandManager.getItem(id);
    }
    getAllCustomCommands() {
        return customCommandManager.getAllItems();
    }

    getAllActiveCommands() {
        return [
            ...systemCommandManager.getSystemCommandDefinitions(),
            ...customCommandManager.getAllItems()
        ].filter(c => c.active);
    }

    triggerIsTaken(trigger) {
        return this.getAllActiveCommands()
            .some(c => c.trigger.toLowerCase() === trigger.toLowerCase());
    }

    // this updates the trigger even if the user has saved an override of the default trigger
    forceUpdateSysCommandTrigger(id, newTrigger) {
        const override = systemCommandManager.getItem(id);
        if (override != null) {
            override.trigger = newTrigger;
            systemCommandManager.saveItem(override);
        }
        const commandDefinition = systemCommandManager.getSystemCommandDefinitionById(id);
        if (commandDefinition != null) {
            commandDefinition.definition.trigger = newTrigger;
            systemCommandManager.saveDefaultSystemCommandDefinition(commandDefinition);
        }
        renderWindow.webContents.send("systemCommandsUpdated");
    }

    //saves a system command override
    saveSystemCommandOverride(sysCommand) {
        systemCommandManager.saveItem(sysCommand);
    }

    saveCustomCommand(command, user) {
        customCommandManager.saveItem(command, user);
    }
    removeCustomCommandByTrigger(trigger) {
        customCommandManager.deleteItemByTrigger(trigger);
    }
}

const manager = new CommandManager();

module.exports = manager;

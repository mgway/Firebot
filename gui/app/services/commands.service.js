"use strict";
(function() {
    angular
        .module("firebotApp")
        .factory("commandsService", function(
            connectionService,
            backendCommunicator
        ) {
            let service = {};

            service.customCommandSearch = "";

            // in memory commands storage
            service.commandsCache = {
                systemCommands: [],
                customCommands: []
            };

            const updateCustomCommands = (command) => {
                const index = service.commandsCache.customCommands.findIndex(c => c.id === command.id);
                if (index > -1) {
                    service.commandsCache.customCommands[index] = command;
                } else {
                    service.commandsCache.customCommands.push(command);
                }
            };

            const updateSystemCommands = (command) => {
                const index = service.commandsCache.systemCommands.findIndex(c => c.id === command.id);
                if (index > -1) {
                    service.commandsCache.systemCommands[index] = command;
                } else {
                    service.commandsCache.systemCommands.push(command);
                }
            };

            service.loadCommands = async () => {
                const customCommands = await backendCommunicator.fireEventAsync("getCustomCommands");
                if (customCommands) {
                    service.commandsCache.customCommands = customCommands;
                }

                const systemCommands = await backendCommunicator.fireEventAsync("getSystemCommands");
                if (systemCommands) {
                    service.commandsCache.systemCommands = systemCommands;
                }
            };

            backendCommunicator.on("all-custom-commands", customCommands => {
                if (customCommands != null) {
                    service.commandsCache.customCommands = customCommands;
                }
            });

            backendCommunicator.on("all-system-commands", systemCommands => {
                if (systemCommands != null) {
                    service.commandsCache.systemCommands = systemCommands;
                }
            });

            service.getSystemCommands = () => service.commandsCache.systemCommands;

            service.getCustomCommands = () => service.commandsCache.customCommands;

            service.saveCustomCommand = async (customCommand, user = null) => {
                if (user == null) {
                    user = connectionService.accounts.streamer.username;
                }

                const savedCommand = await backendCommunicator.fireEventAsync("saveCustomCommand", {customCommand: JSON.parse(angular.toJson(customCommand)), user});

                if (savedCommand != null) {
                    updateCustomCommands(savedCommand);
                }
            };

            service.saveAllCustomCommands = (commands) => {
                service.commandsCache.customCommands = commands;
                backendCommunicator.fireEvent("saveAllCustomCommands", commands);
            };

            service.saveSystemCommand = async (command) => {
                const savedCommand = await backendCommunicator.fireEventAsync("saveSystemCommand", JSON.parse(angular.toJson(command)));

                if (savedCommand != null) {
                    updateSystemCommands(savedCommand);
                }
            };

            service.triggerExists = function(trigger) {
                if (trigger == null) {
                    return false;
                }

                return [
                    ...service.commandsCache.customCommands,
                    ...service.commandsCache.systemCommands
                ].some(c => c.trigger.toLowerCase() === trigger.toLowerCase());
            };

            service.deleteCustomCommand = (commandId) => {
                service.commandsCache.customCommands = service.commandsCache.customCommands.filter(c => c.id !== commandId);
                backendCommunicator.fireEvent("deleteCustomCommand", commandId);
            };

            service.deleteSystemCommand = (commandId) => {
                backendCommunicator.fireEvent("deleteSystemCommand", commandId);
            };


            return service;
        });
}());

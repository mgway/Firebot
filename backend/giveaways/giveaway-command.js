"use strict";

const commandManager = require("../chat/commands/CommandManager");

let giveawayCommandId = "";
let giveawayCommand = {};

const getGiveawayCommandDefinition = (giveaway) => {
    giveawayCommandId = "firebot:giveaways:" + giveaway.id;
    const cleanName = giveaway.name.replace(/\s+/g, '-').toLowerCase(); // lowercase and replace spaces with dash.

    giveawayCommand = {
        definition: {
            id: giveawayCommandId,
            name: giveaway.name + " Giveaway",
            active: true,
            trigger: "!" + cleanName,
            description: "Allows management of the \"" + giveaway.name + "\" giveaway",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            cooldown: {
                user: 0,
                global: 0
            },
            baseCommandDescription: "Display the current giveaway",
            options: {
                outputTemplate: {
                    type: "string",
                    title: "Giveaway Display Template",
                    description: "How the giveaway message displays in chat.",
                    tip: "Variables: {prize}",
                    default: ``,
                    useTextArea: true
                }
            },
            subCommands: [
                {
                    arg: "set",
                    usage: "set [prize]",
                    description: "Sets the prize of the giveaway.",
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "mod",
                                    "broadcaster"
                                ]
                            }
                        ]
                    }
                },
                {
                    arg: "start",
                    usage: "start",
                    description: "Starts the giveaway with an empty entries list.",
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "mod",
                                    "broadcaster"
                                ]
                            }
                        ]
                    }
                },
                {
                    arg: "open",
                    usage: "open",
                    description: "Opens the giveaway without throwing away entries.",
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "mod",
                                    "broadcaster"
                                ]
                            }
                        ]
                    }
                },
                {
                    arg: "close",
                    usage: "close",
                    description: "Closes the giveaway.",
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "mod",
                                    "broadcaster"
                                ]
                            }
                        ]
                    }
                },
                {
                    arg: "draw",
                    usage: "draw",
                    description: "Draws a winner.",
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "mod",
                                    "broadcaster"
                                ]
                            }
                        ]
                    }
                },
                {
                    arg: "enter",
                    usage: "enter",
                    description: "Lets a user enter the giveaway."
                },
                {
                    arg: "leave",
                    usage: "leave",
                    description: "Lets a user leave the giveaway."
                }
            ]
        },
        onTriggerEvent: async () => {}
    };

    return giveawayCommand;
};

const registerGiveawayCommand = (giveaway) => {
    const giveawayCommandId = "firebot:giveaways:" + giveaway.id;
    if (!commandManager.hasSystemCommand(giveawayCommandId)) {
        const giveawayCommand = getGiveawayCommandDefinition(giveaway);
        commandManager.registerSystemCommand(giveawayCommand);
    }
};

const unregisterGiveawayCommand = () => {
    commandManager.unregisterSystemCommand(giveawayCommandId);
};

exports.getGiveawayCommandDefinition = getGiveawayCommandDefinition;
exports.registerGiveawayCommand = registerGiveawayCommand;
exports.unregisterGiveawayCommand = unregisterGiveawayCommand;
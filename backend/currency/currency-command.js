"use strict";

const currencyDatabase = require("../database/currencyDatabase");
const logger = require("../logwrapper");
const util = require("../utility");
const SystemCommand = require("../chat/commands/system-command");
const frontendCommunicator = require("../common/frontend-communicator");

class CurrencyCommand extends SystemCommand {
    constructor(currency) {
        const cleanName = currency.name.replace(/\s+/g, '-').toLowerCase(); // lowecase and replace spaces with dash.

        super({
            id: "firebot:currency:" + currency.id,
            name: currency.name + " Management",
            type: "system",
            active: true,
            trigger: "!" + cleanName,
            description: "Allows management of the \"" + currency.name + "\" currency",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            currency: {
                name: currency.name,
                id: currency.id
            },
            cooldown: {
                user: 0,
                global: 0
            },
            baseCommandDescription: "See your balance",
            options: {
                currencyBalanceMessageTemplate: {
                    type: "string",
                    title: "Currency Balance Message Template",
                    description: "How the currency balance message appears in chat.",
                    tip: "Variables: {user}, {currency}, {amount}",
                    default: `{user}'s {currency} total is {amount}`,
                    useTextArea: true
                },
                whisperCurrencyBalanceMessage: {
                    type: "boolean",
                    title: "Whisper Currency Balance Message",
                    default: false
                },
                addMessageTemplate: {
                    type: "string",
                    title: "Add Currency Message Template",
                    description: "How the !currency add message appears in chat.",
                    tip: "Variables: {user}, {currency}, {amount}",
                    default: `Added {amount} {currency} to {user}.`,
                    useTextArea: true
                },
                removeMessageTemplate: {
                    type: "string",
                    title: "Remove Currency Message Template",
                    description: "How the !currency remove message appears in chat.",
                    tip: "Variables: {user}, {currency}, {amount}",
                    default: `Removed {amount} {currency} from {user}.`,
                    useTextArea: true
                },
                addAllMessageTemplate: {
                    type: "string",
                    title: "Add All Currency Message Template",
                    description: "How the !currency addall message appears in chat.",
                    tip: "Variables: {currency}, {amount}",
                    default: `Added {amount} {currency} to everyone!`,
                    useTextArea: true
                },
                removeAllMessageTemplate: {
                    type: "string",
                    title: "Remove All Currency Message Template",
                    description: "How the !currency removeall message appears in chat.",
                    tip: "Variables: {currency}, {amount}",
                    default: `Removed {amount} {currency} from everyone!`,
                    useTextArea: true
                }
            },
            subCommands: [
                {
                    arg: "add",
                    usage: "add [@user] [amount]",
                    description: "Adds currency for a given user.",
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
                    arg: "remove",
                    usage: "remove [@user] [amount]",
                    description: "Removes currency for a given user.",
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
                    arg: "give",
                    usage: "give [@user] [amount]",
                    description: "Gives currency from one user to another user."
                },
                {
                    arg: "addall",
                    usage: "addall [amount]",
                    description: "Adds currency to all online users.",
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
                    arg: "removeall",
                    usage: "removeall [amount]",
                    description: "Removes currency from all online users.",
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
                }
            ]
        });

        this.currency = currency;
        this.setupEventListeners();
    }

    setupEventListeners() {
        frontendCommunicator.on("registerCurrencyCommand", id => {
            if (id === this.currency.id) {
                this.register();
            }
        });

        frontendCommunicator.on("unregisterCurrencyCommand", id => {
            if (id === this.currency.id) {
                this.unregister();
            }
        });

        frontendCommunicator.on("deleteCurrencyCommand", id => {
            const systemCommandManager = require("../chat/commands/system-command-manager");
            if (id === this.currency.id) {
                systemCommandManager.deleteItem(this.definition.id, true);
            }
        });
    }

    /**
     * @override
     * @inheritdoc
     * @param {SystemCommand.CommandEvent} event
     */
    async onTriggerEvent(event) {
        const twitchChat = require("../chat/twitch-chat");

        const { commandOptions } = event;
        const triggeredArg = event.userCommand.triggeredArg;
        const args = event.userCommand.args;
        const currencyName = event.command.currency.name;

        // No args, tell the user how much currency they have.
        if (args.length === 0) {
            currencyDatabase.getUserCurrencyAmount(event.userCommand.commandSender, this.currency.id).then(function(amount) {
                if (!isNaN(amount)) {
                    const balanceMessage = commandOptions.currencyBalanceMessageTemplate
                        .replace("{user}", event.userCommand.commandSender)
                        .replace("{currency}", currencyName)
                        .replace("{amount}", util.commafy(amount));

                    twitchChat.sendChatMessage(balanceMessage, commandOptions.whisperCurrencyBalanceMessage ? event.userCommand.commandSender : null);
                } else {
                    logger.log('Error while trying to show currency amount to user via chat command.');
                }
            });

            return;
        }

        // Arguments passed, what are we even doing?!?
        switch (triggeredArg) {
        case "add": {
            // Get username and make sure our currency amount is a positive integer.
            const username = args[1].replace(/^@/, ''),
                currencyAdjust = Math.abs(parseInt(args[2]));

            // Adjust currency, it will return true on success and false on failure.
            currencyDatabase.adjustCurrencyForUser(username, this.currency.id, currencyAdjust).then(function(status) {
                if (status) {
                    const addMessageTemplate = commandOptions.addMessageTemplate
                        .replace("{user}", username)
                        .replace("{currency}", currencyName)
                        .replace("{amount}", util.commafy(currencyAdjust));
                    twitchChat.sendChatMessage(addMessageTemplate);
                } else {
                    // Error removing currency.
                    twitchChat.sendChatMessage(
                        `Error: Could not add currency to user.`);
                    logger.error('Error adding currency for user (' + username + ') via chat command. Currency: ' + this.currency.id + '. Value: ' + currencyAdjust);
                }
            });

            break;
        }
        case "remove": {
            // Get username and make sure our currency amount is a negative integer.
            const username = args[1].replace(/^@/, ''),
                currencyAdjust = -Math.abs(parseInt(args[2]));

            // Adjust currency, it will return true on success and false on failure.
            const adjustSuccess = await currencyDatabase.adjustCurrencyForUser(username, this.currency.id, currencyAdjust);
            if (adjustSuccess) {
                const removeMessageTemplate = commandOptions.removeMessageTemplate
                    .replace("{user}", username)
                    .replace("{currency}", currencyName)
                    .replace("{amount}", util.commafy(parseInt(args[2])));
                twitchChat.sendChatMessage(removeMessageTemplate);
            } else {
                // Error removing currency.
                twitchChat.sendChatMessage(
                    `Error: Could not remove currency from user.`);
                logger.error('Error removing currency for user (' + username + ') via chat command. Currency: ' + this.currency.id + '. Value: ' + currencyAdjust);
            }

            break;
        }
        case "give": {
            // Get username and make sure our currency amount is a positive integer.
            const username = args[1].replace(/^@/, ''),
                currencyAdjust = Math.abs(parseInt(args[2])),
                currencyAdjustNeg = -Math.abs(parseInt(args[2]));

            // Does this currency have transfer active?
            const currencyCheck = currencyDatabase.getCurrencies();
            if (currencyCheck[this.currency.id].transfer === "Disallow") {
                twitchChat.sendChatMessage('Transfers are not allowed for this currency.');
                logger.debug(event.userCommand.commandSender + ' tried to give currency, but transfers are turned off for it. ' + this.currency.id);
                return false;
            }

            // Dont allow person to give themselves currency.
            if (event.userCommand.commandSender.toLowerCase() === username.toLowerCase()) {
                twitchChat.sendChatMessage(
                    `${event.userCommand.commandSender}, you can't give yourself currency.`);
                logger.debug(username + ' tried to give themselves currency.');
                return false;
            }

            // eslint-disable-next-line no-warning-comments
            // Need to check to make sure they have enough currency before continuing.
            const userAmount = await currencyDatabase.getUserCurrencyAmount(event.userCommand.commandSender, this.currency.id);

            // If we get false, there was an error.
            if (userAmount === false) {
                twitchChat.sendChatMessage('Error: Could not retrieve currency.');
                return false;
            }

            // Check to make sure we have enough currency to give.
            if (userAmount < currencyAdjust) {
                twitchChat.sendChatMessage('You do not have enough ' + currencyName + ' to do this action.');
                return false;
            }

            // Okay, try to add to user first. User is not guaranteed to be in the DB because of possible typos.
            // So we check this first, then remove from the command sender if this succeeds.
            const adjustCurrencySuccess = await currencyDatabase.adjustCurrencyForUser(username, this.currency.id, currencyAdjust);
            if (adjustCurrencySuccess) {
                // Subtract currency from command user now.
                currencyDatabase.adjustCurrencyForUser(event.userCommand.commandSender, this.currency.id, currencyAdjustNeg).then(function(status) {
                    if (status) {
                        twitchChat.sendChatMessage('Gave ' + util.commafy(currencyAdjust) + ' ' + currencyName + ' to ' + username + '.', null);
                        return true;
                    }
                    // Error removing currency.
                    twitchChat.sendChatMessage(
                        `Error: Could not remove currency to user during give transaction.`);
                    logger.error('Error removing currency during give transaction for user (' + username + ') via chat command. Currency: ' + this.currency.id + '. Value: ' + currencyAdjust);
                    return false;

                });

            } else {
                // Error removing currency.
                twitchChat.sendChatMessage(`Error: Could not add currency to user. Was there a typo in the username?`);
                logger.error('Error adding currency during give transaction for user (' + username + ') via chat command. Currency: ' + this.currency.id + '. Value: ' + currencyAdjust);
                return false;
            }

            break;
        }
        case "addall": {
            const currencyAdjust = Math.abs(parseInt(args[1]));
            if (isNaN(currencyAdjust)) {
                twitchChat.sendChatMessage(
                    `Error: Could not add currency to all online users.`);
                return;
            }
            currencyDatabase.addCurrencyToOnlineUsers(this.currency.id, currencyAdjust, true);

            const addAllMessageTemplate = commandOptions.addAllMessageTemplate
                .replace("{currency}", currencyName)
                .replace("{amount}", util.commafy(currencyAdjust));
            twitchChat.sendChatMessage(addAllMessageTemplate);

            break;
        }
        case "removeall": {
            const currencyAdjust = -Math.abs(parseInt(args[1]));
            if (isNaN(currencyAdjust)) {
                twitchChat.sendChatMessage(
                    `Error: Could not remove currency from all online users.`);
                return;
            }
            currencyDatabase.addCurrencyToOnlineUsers(this.currency.id, currencyAdjust, true);

            const removeAllMessageTemplate = commandOptions.removeAllMessageTemplate
                .replace("{currency}", currencyName)
                .replace("{amount}", util.commafy(parseInt(args[1])));
            twitchChat.sendChatMessage(removeAllMessageTemplate);

            break;
        }
        default: {
            currencyDatabase.getUserCurrencyAmount(event.userCommand.commandSender, this.currency.id).then(function(amount) {
                if (!isNaN(amount)) {
                    const balanceMessage = commandOptions.currencyBalanceMessageTemplate
                        .replace("{user}", event.userCommand.commandSender)
                        .replace("{currency}", currencyName)
                        .replace("{amount}", util.commafy(amount));

                    twitchChat.sendChatMessage(balanceMessage, commandOptions.whisperCurrencyBalanceMessage ? event.userCommand.commandSender : null);
                } else {
                    logger.log('Error while trying to show currency amount to user via chat command.');
                }
            });
        }
        }
    }
}

const createNewCurrencyCommand = (currency) => {
    if (!currency) {
        return;
    }

    const currencyCommand = new CurrencyCommand(currency);
    if (currency.active) {
        currencyCommand.register();
    }
};

frontendCommunicator.on("createCurrencyCommand", currency => {
    createNewCurrencyCommand(currency);
});

exports.createNewCurrencyCommand = createNewCurrencyCommand;
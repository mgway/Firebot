"use strict";

const util = require("../../../../utility");
const twitchChat = require("../../../twitch-chat");
const gameManager = require("../../../../games/game-manager");
const currencyDatabase = require("../../../../database/currencyDatabase");
const moment = require("moment");
const NodeCache = require("node-cache");
const SystemCommand = require("../../system-command");

class BidCommand extends SystemCommand {
    constructor() {
        super({
            id: "firebot:bid",
            name: "Bid",
            type: "system",
            active: true,
            trigger: "!bid",
            description: "Allows viewers to participate in the Bid game.",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            hideCooldowns: true,
            subCommands: [
                {
                    id: "bidStart",
                    arg: "start",
                    usage: "start [currencyAmount]",
                    description: "Starts the bidding at the given amount.",
                    hideCooldowns: true,
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "broadcaster",
                                    "mod"
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "bidStop",
                    arg: "stop",
                    usage: "stop",
                    description: "Manually stops the bidding. Highest bidder wins.",
                    hideCooldowns: true,
                    restrictionData: {
                        restrictions: [
                            {
                                id: "sys-cmd-mods-only-perms",
                                type: "firebot:permissions",
                                mode: "roles",
                                roleIds: [
                                    "broadcaster",
                                    "mod"
                                ]
                            }
                        ]
                    }
                },
                {
                    id: "bidAmount",
                    arg: "\\d+",
                    regex: true,
                    usage: "[currencyAmount]",
                    description: "Joins the bidding at the given amount.",
                    hideCooldowns: true
                }
            ]
        }, false);

        this.cooldownCache = new NodeCache({checkperiod: 5});
        this.bidTimer = null;

        this.activeBiddingInfo = {
            "active": false,
            "currentBid": 0,
            "topBidder": ""
        };
    }

    /**
     * @override
     * @inheritdoc
     * @param {SystemCommand.CommandEvent} event
     */
    async onTriggerEvent(event) {
        const { chatEvent, userCommand } = event;

        const bidSettings = gameManager.getGameSettings("firebot-bid");
        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

        if (event.userCommand.subcommandId === "bidStart") {
            const triggeredArg = userCommand.args[1];
            const bidAmount = parseInt(triggeredArg);
            const username = userCommand.commandSender;

            if (isNaN(bidAmount)) {
                twitchChat.sendChatMessage(`Invalid amount. Please enter a number to start bidding.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (this.activeBiddingInfo.active !== false) {
                twitchChat.sendChatMessage(`There is already a bid running. Use !bid stop to stop it.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (bidAmount < bidSettings.settings.currencySettings.minBid) {
                twitchChat.sendChatMessage(`The opening bid must be more than ${bidSettings.settings.currencySettings.minBid}.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            this.activeBiddingInfo = {
                "active": true,
                "currentBid": bidAmount,
                "topBidder": ""
            };

            let raiseMinimum = bidSettings.settings.currencySettings.minIncrement;
            let minimumBidWithRaise = this.activeBiddingInfo.currentBid + raiseMinimum;
            twitchChat.sendChatMessage(`Bidding has started at ${bidAmount} ${currencyName}. Type !bid ${minimumBidWithRaise} to start bidding.`, null, chatter);

            let timeLimit = bidSettings.settings.timeSettings.timeLimit * 60000;
            this.bidTimer = setTimeout(function() {
                this.stopBidding(chatter);
            }, timeLimit);

        } else if (event.userCommand.subcommandId === "bidStop") {
            this.stopBidding(chatter);
        } else if (event.userCommand.subcommandId === "bidAmount") {

            const triggeredArg = userCommand.args[0];
            const bidAmount = parseInt(triggeredArg);
            const username = userCommand.commandSender;

            if (this.activeBiddingInfo.active === false) {
                twitchChat.sendChatMessage(`There is no active bidding in progress.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let cooldownExpireTime = this.cooldownCache.get(username);
            if (cooldownExpireTime && moment().isBefore(cooldownExpireTime)) {
                const timeRemainingDisplay = util.secondsForHumans(Math.abs(moment().diff(cooldownExpireTime, 'seconds')));
                twitchChat.sendChatMessage(`You placed a bid recently! Please wait ${timeRemainingDisplay} before placing another bid.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (this.activeBiddingInfo.topBidder === username) {
                twitchChat.sendChatMessage("You are already the top bidder. You can't bid against yourself.", username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (bidAmount < 1) {
                twitchChat.sendChatMessage("Bid amount must be more than 0.", username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            const minBid = bidSettings.settings.currencySettings.minBid;
            if (minBid != null & minBid > 0) {
                if (bidAmount < minBid) {
                    twitchChat.sendChatMessage(`Bid amount must be at least ${minBid} ${currencyName}.`, username, chatter);
                    twitchChat.deleteMessage(chatEvent.id);
                    return;
                }
            }

            const userBalance = await currencyDatabase.getUserCurrencyAmount(username, currencyId);
            if (userBalance < bidAmount) {
                twitchChat.sendChatMessage(`You don't have enough ${currencyName}!`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let raiseMinimum = bidSettings.settings.currencySettings.minIncrement;
            let minimumBidWithRaise = this.activeBiddingInfo.currentBid + raiseMinimum;
            if (bidAmount < minimumBidWithRaise) {
                twitchChat.sendChatMessage(`You must bid at least ${minimumBidWithRaise} ${currencyName}.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let previousHighBidder = this.activeBiddingInfo.topBidder;
            let previousHighBidAmount = this.activeBiddingInfo.currentBid;
            if (previousHighBidder != null && previousHighBidder !== "") {
                await currencyDatabase.adjustCurrencyForUser(previousHighBidder, currencyId, previousHighBidAmount);
                twitchChat.sendChatMessage(`You have been out bid! You've been refunded ${previousHighBidAmount} ${currencyName}.`, previousHighBidder, chatter);
            }

            await currencyDatabase.adjustCurrencyForUser(username, currencyId, -Math.abs(bidAmount));
            let newTopBidWithRaise = bidAmount + raiseMinimum;
            twitchChat.sendChatMessage(`${username} is the new high bidder at ${bidAmount} ${currencyName}. To bid, type !bid ${newTopBidWithRaise} (or higher).`);

            // eslint-disable-next-line no-use-before-define
            this.setNewHighBidder(username, bidAmount);

            let cooldownSecs = bidSettings.settings.cooldownSettings.cooldown;
            if (cooldownSecs && cooldownSecs > 0) {
                const expireTime = moment().add(cooldownSecs, 'seconds');
                this.cooldownCache.set(username, expireTime, cooldownSecs);
            }
        } else {
            twitchChat.sendChatMessage(`Incorrect bid usage: ${userCommand.trigger} [bidAmount]`, userCommand.commandSender, chatter);
            twitchChat.deleteMessage(chatEvent.id);
        }
    }

    purgeCaches() {
        this.cooldownCache.flushAll();
        this.activeBiddingInfo = {
            "active": false,
            "currentBid": 0,
            "topBidder": ""
        };
    }

    setNewHighBidder(username, amount) {
        this.activeBiddingInfo.currentBid = amount;
        this.activeBiddingInfo.topBidder = username;
    }

    stopBidding(chatter) {
        clearTimeout(this.bidTimer);
        if (this.activeBiddingInfo.topBidder) {
            twitchChat.sendChatMessage(`${this.activeBiddingInfo.topBidder} has won the bidding with ${this.activeBiddingInfo.currentBid}!`, null, chatter);
        } else {
            twitchChat.sendChatMessage(`There is no winner, because no one bid!`, null, chatter);
        }

        this.purgeCaches();
    }
}

module.exports = new BidCommand();
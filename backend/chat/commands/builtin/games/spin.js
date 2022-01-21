"use strict";

const util = require("../../../../utility");
const twitchChat = require("../../../twitch-chat");
const gameManager = require("../../../../games/game-manager");
const currencyDatabase = require("../../../../database/currencyDatabase");
const customRolesManager = require("../../../../roles/custom-roles-manager");
const teamRolesManager = require("../../../../roles/team-roles-manager");
const twitchRolesManager = require("../../../../../shared/twitch-roles");
const slotMachine = require("../../../../games/builtin/slots/slot-machine");
const logger = require("../../../../logwrapper");
const moment = require("moment");
const NodeCache = require("node-cache");
const SystemCommand = require("../../system-command");

class SpinCommand extends SystemCommand {
    constructor() {
        super({
            id: "firebot:spin",
            name: "Spin (Slots)",
            type: "system",
            active: true,
            trigger: "!spin",
            description: "Allows viewers to play the Slots game.",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            hideCooldowns: true,
            subCommands: [
                {
                    id: "spinAmount",
                    arg: "\\d+",
                    regex: true,
                    usage: "[currencyAmount]",
                    description: "Spins the slot machine with the given amount",
                    hideCooldowns: true
                }
            ]
        }, false);

        this.activeSpinners = new NodeCache({checkperiod: 2});
        this.cooldownCache = new NodeCache({checkperiod: 5});
    }

    /**
     * @override
     * @inheritdoc
     * @param {SystemCommand.CommandEvent} event
     */
    async onTriggerEvent(event) {
        const { userCommand } = event;

        const slotsSettings = gameManager.getGameSettings("firebot-slots");
        const chatter = slotsSettings.settings.chatSettings.chatter;
        const username = userCommand.commandSender;

        // parse the wager amount
        let wagerAmount;
        if (event.userCommand.args.length < 1) {
            let defaultWager = slotsSettings.settings.currencySettings.defaultWager;
            if ((defaultWager == null || defaultWager) < 1) {
                if (slotsSettings.settings.generalMessages.noWagerAmount) {
                    const noWagerAmountMsg = slotsSettings.settings.generalMessages.noWagerAmount
                        .replace("{user}", username);

                    twitchChat.sendChatMessage(noWagerAmountMsg, null, chatter);
                }

                return;
            }
            wagerAmount = defaultWager;
        } else if (event.userCommand.subcommandId === "spinAmount") {
            const triggeredArg = userCommand.args[0];
            wagerAmount = parseInt(triggeredArg);
        } else {
            if (slotsSettings.settings.generalMessages.invalidWagerAmount) {
                const invalidWagerAmountMsg = slotsSettings.settings.generalMessages.invalidWagerAmount
                    .replace("{user}", username);

                twitchChat.sendChatMessage(invalidWagerAmountMsg, null, chatter);
            }

            return;
        }

        if (this.activeSpinners.get(username)) {
            if (slotsSettings.settings.generalMessages.alreadySpinning) {
                const alreadySpinningMsg = slotsSettings.settings.generalMessages.alreadySpinning
                    .replace("{username}", username);

                twitchChat.sendChatMessage(alreadySpinningMsg, null, chatter);
            }

            return;
        }

        const cooldownExpireTime = this.cooldownCache.get(username);
        if (cooldownExpireTime && moment().isBefore(cooldownExpireTime)) {
            if (slotsSettings.settings.generalMessages.onCooldown) {
                const timeRemainingDisplay = util.secondsForHumans(Math.abs(moment().diff(cooldownExpireTime, 'seconds')));
                const cooldownMsg = slotsSettings.settings.generalMessages.onCooldown
                    .replace("{username}", username).replace("{timeRemaining}", timeRemainingDisplay);

                twitchChat.sendChatMessage(cooldownMsg, null, chatter);
            }

            return;
        }

        if (wagerAmount < 1) {
            if (slotsSettings.settings.generalMessages.moreThanZero) {
                const moreThanZeroMsg = slotsSettings.settings.generalMessages.moreThanZero
                    .replace("{username}", username);

                twitchChat.sendChatMessage(moreThanZeroMsg, null, chatter);
            }

            return;
        }

        const minWager = slotsSettings.settings.currencySettings.minWager;
        if (minWager != null & minWager > 0) {
            if (wagerAmount < minWager) {
                if (slotsSettings.settings.generalMessages.minWager) {
                    const minWagerMsg = slotsSettings.settings.generalMessages.minWager
                        .replace("{username}", username).replace("{minWager}", minWager);

                    twitchChat.sendChatMessage(minWagerMsg, null, chatter);
                }

                return;
            }
        }
        const maxWager = slotsSettings.settings.currencySettings.maxWager;
        if (maxWager != null & maxWager > 0) {
            if (wagerAmount > maxWager) {
                if (slotsSettings.settings.generalMessages.maxWager) {
                    const maxWagerMsg = slotsSettings.settings.generalMessages.maxWager
                        .replace("{username}", username).replace("{maxWager}", maxWager);

                    twitchChat.sendChatMessage(maxWagerMsg, null, chatter);
                }

                return;
            }
        }

        const currencyId = slotsSettings.settings.currencySettings.currencyId;
        let userBalance;
        try {
            userBalance = await currencyDatabase.getUserCurrencyAmount(username, currencyId);
        } catch (error) {
            logger.error(error);
            userBalance = 0;
        }

        if (userBalance < wagerAmount) {
            if (slotsSettings.settings.generalMessages.notEnough) {
                const notEnoughMsg = slotsSettings.settings.generalMessages.notEnough
                    .replace("{username}", username);

                twitchChat.sendChatMessage(notEnoughMsg, null, chatter);
            }

            return;
        }

        this.activeSpinners.set(username, true);

        const cooldownSecs = slotsSettings.settings.cooldownSettings.cooldown;
        if (cooldownSecs && cooldownSecs > 0) {
            const expireTime = moment().add(cooldownSecs, 'seconds');
            this.cooldownCache.set(username, expireTime, cooldownSecs);
        }

        try {
            await currencyDatabase.adjustCurrencyForUser(username, currencyId, -Math.abs(wagerAmount));
        } catch (error) {
            logger.error(error);
            twitchChat.sendChatMessage(`Sorry ${username}, there was an error deducting currency from your balance so the spin has been canceled.`, null, chatter);
            this.activeSpinners.del(username);
            return;
        }

        let successChance = 50;

        const successChancesSettings = slotsSettings.settings.spinSettings.successChances;
        if (successChancesSettings) {
            try {
                successChance = successChancesSettings.basePercent;

                const userCustomRoles = customRolesManager.getAllCustomRolesForViewer(username) || [];
                const userTeamRoles = await teamRolesManager.getAllTeamRolesForViewer(username) || [];
                const userTwitchRoles = (userCommand.senderRoles || [])
                    .map(r => twitchRolesManager.mapTwitchRole(r))
                    .filter(r => !!r);

                const allRoles = [
                    ...userTwitchRoles,
                    ...userTeamRoles,
                    ...userCustomRoles
                ];

                for (let role of successChancesSettings.roles) {
                    if (allRoles.some(r => r.id === role.roleId)) {
                        successChance = role.percent;
                        break;
                    }
                }
            } catch (error) {
                logger.error("There was an error while computing success chances, using base", error);
            }
        }

        const spinInActionMsg = slotsSettings.settings.generalMessages.spinInAction
            .replace("{username}", username);
        const showSpinInActionMsg = !!slotsSettings.settings.generalMessages.spinInAction;
        const successfulRolls = await slotMachine.spin(showSpinInActionMsg, spinInActionMsg, successChance, chatter);

        const winMultiplier = slotsSettings.settings.spinSettings.multiplier;

        const winnings = Math.floor(wagerAmount * (successfulRolls * winMultiplier));

        await currencyDatabase.adjustCurrencyForUser(username, currencyId, winnings);

        if (slotsSettings.settings.generalMessages.spinSuccessful) {
            const currency = currencyDatabase.getCurrencyById(currencyId);

            const spinSuccessfulMsg = slotsSettings.settings.generalMessages.spinSuccessful
                .replace("{username}", username)
                .replace("{successfulRolls}", successfulRolls)
                .replace("{winningsAmount}", util.commafy(winnings))
                .replace("{currencyName}", currency.name);
            twitchChat.sendChatMessage(spinSuccessfulMsg, null, chatter);
        }

        this.activeSpinners.del(username);
    }

    purgeCaches() {
        this.cooldownCache.flushAll();
        this.activeSpinners.flushAll();
    }
}

module.exports = new SpinCommand();
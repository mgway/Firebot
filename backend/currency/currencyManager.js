"use strict";

const { ipcMain } = require("electron");
const logger = require("../logwrapper");
const currencyDatabase = require("../database/currencyDatabase");
const twitchChat = require('../chat/twitch-chat');
const moment = require("moment");
const connectionManager = require("../common/connection-manager");
const currencyCommand = require("./currency-command");

let currencyInterval = null;

// This file manages the currency payout intervals.
// For manipulating currency check out /database/currencyDatabase.js
function processCurrencyTimer(currency, basePayout) {
    const bonusObject = currency.bonus;
    // Add base payout to everyone.
    currencyDatabase.addCurrencyToOnlineUsers(currency.id, basePayout).then(async () => {
        // Loop through our bonuses and try to apply the currency.
        try {
            for (const bonusKey of Object.keys(bonusObject)) {
                await currencyDatabase.addCurrencyToUserGroupOnlineUsers([bonusKey], currency.id, bonusObject[bonusKey]);
            }
        } catch (err) {
            logger.error('Error while processing currency timer. Could not add bonus currency to a role.', err);
        }
    }).catch(() => {
        logger.error('Error while processing currency timer. Could not add currency to all online users.');
        return;
    });
}

// This is run when the interval fires for currencies.
function applyCurrency() {
    logger.debug("Running currency timer...");

    let currencyData = currencyDatabase.getCurrencies();

    Object.values(currencyData).forEach(currency => {
        let basePayout = currency.payout;
        if (!connectionManager.streamerIsOnline()) {
            if (currency.offline == null || currency.offline === 0 || currency.offline === "") {
                return;
            }

            basePayout = currency.offline;
        }

        let currentMinutes = moment().minutes();
        let intervalMod = currentMinutes % currency.interval;
        const chatConnected = twitchChat.chatIsConnected();
        if (intervalMod === 0 && currency.active && chatConnected) {
            // do payout
            logger.info("Currency: Paying out " + basePayout + " " + currency.name + ".");

            processCurrencyTimer(currency, basePayout);
        } else if (!chatConnected) {
            logger.debug(`Currency: Not connected to chat, so ${currency.name} will not pay out.`);
        } else if (!currency.active) {
            logger.debug(`Currency: ${currency.name} is not active, so it will not pay out.`);
        } else if (intervalMod !== 0) {
            logger.debug(`Currency: ${currency.name} is not ready to pay out yet.`);
        } else {
            logger.error(`Currency: Something weird happened and ${currency.name} couldnt pay out.`);
        }
    });
}

// This will stop our currency timers.
function stopTimer() {
    logger.debug("Clearing previous currency intervals");
    if (currencyInterval != null) {
        clearInterval(currencyInterval);
        currencyInterval = null;
    }
}

// Start up our currency timers at the next full minute mark.
// Then we'll check all of our currencies each minute to see if any need to be applied.
function startTimer() {
    let currentTime = moment();
    let nextMinute = moment()
        .endOf("minute")
        .add(1, "s");
    let diff = nextMinute.diff(currentTime, "seconds");

    logger.debug(`Currency timer will start in ${diff} seconds`);

    setTimeout(() => {
        stopTimer();
        logger.debug("Starting currency timer.");
        //start timer, fire interval every minute.
        currencyInterval = setInterval(() => {
            applyCurrency();
        }, 60000);
    }, diff * 1000);
}





/**
 * Loops through all currencies we have and passes them to refresh currency commands.
 * This lets us create all of our currency commands when the application is started.
 */
function createAllCurrencyCommands() {
    logger.log('Creating all currency commands.');
    const currencyData = currencyDatabase.getCurrencies();

    Object.values(currencyData).forEach(currency => {
        currencyCommand.createNewCurrencyCommand(currency);
    });
}

// Start up our currency timers.
// Also fired in currencyDatabase.js.
ipcMain.on("refreshCurrencyCache", () => {
    startTimer();
});

exports.startTimer = startTimer;
exports.stopTimer = stopTimer;
exports.createAllCurrencyCommands = createAllCurrencyCommands;
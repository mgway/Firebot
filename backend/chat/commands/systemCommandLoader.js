"use strict";

const systemCommandManager = require("./system-command-manager");

exports.loadCommands = () => {
    // get command definitions
    const commandList = require("./builtin/commandList");
    const commandManagement = require("./builtin/commandManagement");
    const uptime = require("./builtin/uptime");
    const followage = require("./builtin/followage");
    const quotesManagement = require('./builtin/quotes');
    const currencyManager = require('../../currency/currencyManager');
    const steam = require("./builtin/steam/steam");
    const customRoleManagement = require("./builtin/custom-role-management");
    const marker = require('./builtin/marker');
    const spamRaidProtection = require('./builtin/spam-raid-protection');

    // register them
    systemCommandManager.registerSystemCommand(commandList);
    systemCommandManager.registerSystemCommand(commandManagement);
    systemCommandManager.registerSystemCommand(uptime);
    systemCommandManager.registerSystemCommand(followage);
    systemCommandManager.registerSystemCommand(quotesManagement);
    systemCommandManager.registerSystemCommand(steam);
    systemCommandManager.registerSystemCommand(customRoleManagement);
    systemCommandManager.registerSystemCommand(marker);
    systemCommandManager.registerSystemCommand(spamRaidProtection);

    currencyManager.createAllCurrencyCommands();
};

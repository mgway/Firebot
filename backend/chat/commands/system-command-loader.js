"use strict";

exports.loadCommands = () => {
    const systemCommandManager = require("./system-command-manager");

    [
        'games/bid',
        'games/heist',
        'games/spin',
        'games/trivia',
        'steam/steam',
        'command-list',
        'command-management',
        'custom-role-management',
        'followage',
        'marker',
        'quotes',
        'spam-raid-protection',
        'uptime',
        'url-permit-command'
    ].forEach(filename => {
        const command = require(`./builtin/${filename}.js`);

        if (command.registeredByDefault) {
            systemCommandManager.registerSystemCommand(command);
        }
    });

    const currencyManager = require('../../currency/currencyManager');
    currencyManager.createAllCurrencyCommands();
};

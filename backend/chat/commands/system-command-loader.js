"use strict";

exports.loadCommands = () => {
    const systemCommandManager = require("./system-command-manager");

    [
        'steam/steam',
        'command-list',
        'command-management',
        'custom-role-management',
        'followage',
        'marker',
        'quotes',
        'spam-raid-protection',
        'uptime'
    ].forEach(filename => {
        const definition = require(`./builtin/${filename}.js`);
        systemCommandManager.registerSystemCommand(definition);
    });

    const currencyManager = require('../../currency/currencyManager');
    currencyManager.createAllCurrencyCommands();
};

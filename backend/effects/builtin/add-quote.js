"use strict";

const twitchChannels = require("../../twitch-api/resource/channels");
const quotesManager = require("../../quotes/quotes-manager");
const { EffectCategory } = require('../../../shared/effect-constants');
const moment = require("moment");

const addQuoteEffect = {
    definition: {
        id: "firebot:add-quote",
        name: "Add Quote",
        description: "Adds a quote to the quote database.",
        icon: "fad fa-quote-right",
        categories: [EffectCategory.FUN],
        dependencies: []
    },
    globalSettings: {},
    optionsTemplate: `    
        <eos-container header="Quote Creator">
            <p class="muted">This is the name of the person who is creating the quote entry.</p>
            <input ng-model="effect.creator" type="text" class="form-control" id="chat-text-setting" placeholder="Enter quote creator" replace-variables/>
        </eos-container>

        <eos-container header="Quote Originator" pad-top="true">
            <p class="muted">This is the name of the person who actually said the quote.</p>
            <input ng-model="effect.originator" type="text" class="form-control" id="chat-text-setting" placeholder="Enter quote originator" replace-variables/>
        </eos-container>

        <eos-container header="Quote Text" pad-top="true">
            <p class="muted">This is the actual quote text.</p>
            <input ng-model="effect.text" type="text" class="form-control" id="chat-text-setting" placeholder="Enter quote text" replace-variables/>
        </eos-container>
    `,
    optionsController: () => {},
    optionsValidator: effect => {
        let errors = [];
        if (effect.creator == null || effect.creator === "") {
            errors.push("Please provide a quote creator.");
        }

        if (effect.originator == null || effect.originator === "") {
            errors.push("Please provide a quote originator.");
        }

        if (effect.text == null || effect.text === "") {
            errors.push("Please provide a value for quote text.");
        }
        return errors;
    },
    onTriggerEvent: async event => {
        const { effect } = event;

        const channelData = await twitchChannels.getChannelInformation();

        const currentGameName = channelData && channelData.gameName ? channelData.gameName : "Unknown game";

        const newQuote = {
            text: effect.text,
            originator: effect.originator.replace(/@/g, ""),
            creator: effect.creator.replace(/@/g, ""),
            game: currentGameName,
            createdAt: moment().toISOString()
        }

        quotesManager.addQuote(newQuote);

        return true;
    }
}

module.exports = addQuoteEffect;
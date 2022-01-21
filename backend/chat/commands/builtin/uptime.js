"use strict";

const SystemCommand = require("../system-command");
const util = require("../../../utility");
const chat = require("../../twitch-chat");

class Uptime extends SystemCommand {
    constructor() {
        super({
            id: "firebot:uptime",
            name: "Uptime",
            type: "system",
            active: true,
            trigger: "!uptime",
            description: "Displays how long the stream has been live in chat.",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            cooldown: {
                user: 0,
                global: 0
            },
            options: {
                uptimeDisplayTemplate: {
                    type: "string",
                    title: "Output Template",
                    description: "How the uptime message is formatted",
                    tip: "Variables: {uptime}",
                    default: `Broadcasting time: {uptime}`,
                    useTextArea: true
                }
            },
            hidden: false
        });
    }

    /**
     * @override
     * @inheritdoc
     * @param {SystemCommand.CommandEvent} event
     */
    async onTriggerEvent(event) {
        const uptimeString = await util.getUptime();
        const { commandOptions } = event;
        chat.sendChatMessage(commandOptions.uptimeDisplayTemplate
            .replace("{uptime}", uptimeString));
    }
}

module.exports = new Uptime();

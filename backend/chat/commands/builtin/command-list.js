"use strict";

const SystemCommand = require("../system-command");

class CommandList extends SystemCommand {
    constructor() {
        super({
            id: "firebot:commandlist",
            name: "Command List",
            type: "system",
            active: true,
            trigger: "!commands",
            description: "Displays link to your profile page with all available commands.",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            cooldown: {
                user: 0,
                global: 0
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
        const cloudSync = require('../../../cloud-sync/profile-sync.js');
        const twitchChat = require("../../../chat/twitch-chat");

        const profileJSON = {
            username: event.chatMessage.username,
            userRoles: event.chatMessage.roles,
            profilePage: 'commands'
        };

        const binId = await cloudSync.syncProfileData(profileJSON);

        if (binId == null) {
            twitchChat.sendChatMessage(
                `${event.chatMessage.username}, there are no commands that you are allowed to run.`, null, "Bot");
        } else {
            twitchChat.sendChatMessage(
                `You can view the list of commands here: https://firebot.app/profile?id=${binId}`, null, "Bot");
        }
    }
}

module.exports = new CommandList();

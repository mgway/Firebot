"use strict";

const logger = require("../../../logwrapper");
const SystemCommand = require("../system-command");

class PermitCommand extends SystemCommand {
    constructor() {
        super({
            id: "firebot:moderation:url:permit",
            name: "Permit",
            type: "system",
            active: true,
            trigger: "!permit",
            usage: "[target]",
            description: "Permits a viewer to post a url for a set duration (see Moderation -> Url Moderation).",
            autoDeleteTrigger: false,
            scanWholeMessage: false,
            hidden: false,
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
            },
            options: {
                permitDuration: {
                    type: "number",
                    title: "Duration in seconds",
                    default: 30,
                    description: "The amount of time the viewer has to post a link after the !permit command is used."
                },
                permitDisplayTemplate: {
                    type: "string",
                    title: "Output Template",
                    description: "The chat message shown when the permit command is used (leave empty for no message).",
                    tip: "Variables: {target}, {duration}",
                    default: `{target}, you have {duration} seconds to post your url in the chat.`,
                    useTextArea: true
                }
            }
        }, false);

        this.tempPermittedUsers = [];
    }

    /**
     * @override
     * @inheritdoc
     * @param {SystemCommand.CommandEvent} event
     */
    async onTriggerEvent(event) {
        const twitchChat = require("../../twitch-chat");
        const { command, commandOptions, userCommand } = event;
        let { args } = userCommand;

        if (command.scanWholeMessage) {
            args = args.filter(a => a !== command.trigger);
        }

        if (args.length !== 1) {
            twitchChat.sendChatMessage("Incorrect command usage!");
            return;
        }

        const target = args[0].replace("@", "");
        if (!target) {
            twitchChat.sendChatMessage("Please specify a user to permit.");
            return;
        }

        this.tempPermittedUsers.push(target);
        logger.debug(`Url moderation: ${target} has been temporary permitted to post a url...`);

        const message = commandOptions.permitDisplayTemplate.replace("{target}", target).replace("{duration}", commandOptions.permitDuration);

        if (message) {
            twitchChat.sendChatMessage(message);
        }

        setTimeout(() => {
            this.tempPermittedUsers = this.tempPermittedUsers.filter(user => user !== target);
            logger.debug(`Url moderation: Temporary url permission for ${target} expired.`);
        }, commandOptions.permitDuration * 1000);
    }

    hasTemporaryPermission(username) {
        return this.tempPermittedUsers.includes(username);
    }
}

module.exports = new PermitCommand();
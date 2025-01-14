"use strict";
(function() {
    //This handles the Moderation tab

    angular
        .module("firebotApp")
        .controller("moderationController", function($scope, chatModerationService, utilityService, settingsService) {

            $scope.settingsService = settingsService;
            $scope.cms = chatModerationService;

            $scope.toggleUrlModerationFeature = () => {
                if (!chatModerationService.chatModerationData.settings.urlModeration.enabled) {
                    chatModerationService.chatModerationData.settings.urlModeration.enabled = true;
                    chatModerationService.registerPermitCommand();
                } else {
                    chatModerationService.chatModerationData.settings.urlModeration.enabled = false;
                    chatModerationService.unregisterPermitCommand();
                }

                chatModerationService.saveChatModerationSettings();
            };

            $scope.showEditBannedWordsModal = () => {
                utilityService.showModal({
                    component: "editBannedWordsModal",
                    backdrop: true,
                    resolveObj: {}
                });
            };
        });
}());

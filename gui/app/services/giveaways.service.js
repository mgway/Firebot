"use strict";

(function() {

    angular
        .module("firebotApp")
        .factory("giveawaysService", function($q, backendCommunicator,
            utilityService, objectCopyHelper, ngToast) {
            let service = {};

            service.giveaways = [];

            const updateGiveaways = (giveaway) => {
                const index = service.giveaways.findIndex(g => g.id === giveaway.id);
                if (index > -1) {
                    service.giveaways[index] = giveaway;
                } else {
                    service.giveaways.push(giveaway);
                }
            };

            service.loadGiveaways = async () => {
                $q.when(backendCommunicator.fireEventAsync("getGiveaways"))
                    .then(giveaways => {
                        if (giveaways) {
                            service.giveaways = Object.values(giveaways);
                        }
                    });
            };

            backendCommunicator.on("all-giveaways", giveaways => {
                if (giveaways != null) {
                    service.giveaways = Object.values(giveaways);
                }
            });

            service.getGiveaways = () => {
                return Object.values(service.giveaways);
            };

            service.getGiveaway = (giveawayId) => {
                return service.giveaways.find(g => g.id === giveawayId);
            };

            service.saveGiveaway = (giveaway) => {
                if (giveaway.active) {
                    backendCommunicator.fireEvent("registerGivewayCommand", giveaway);
                }

                return $q.when(backendCommunicator.fireEventAsync("saveGiveaway", giveaway))
                    .then(savedGiveaway => {
                        if (savedGiveaway) {
                            updateGiveaways(giveaway);
                            return true;
                        }
                        return false;
                    });
            };

            service.saveAllGiveaways = (giveaways) => {
                service.giveaways = giveaways;
                backendCommunicator.fireEvent("saveAllGiveaways", giveaways);
            };

            service.giveawayNameExists = (name) => {
                return service.giveaways.some(g => g.name === name);
            };

            service.duplicateGiveaway = (giveawayId) => {
                const giveaway = service.giveaways.find(g => g.id === giveawayId);
                if (giveaway == null) {
                    return;
                }
                const copiedGiveaway = objectCopyHelper.copyObject("giveaway", giveaway);
                copiedGiveaway.id = null;

                while (service.giveawayNameExists(copiedGiveaway.name)) {
                    copiedGiveaway.name += " copy";
                }

                service.saveGiveaway(copiedGiveaway).then(successful => {
                    if (successful) {
                        ngToast.create({
                            className: 'success',
                            content: 'Successfully duplicated a giveaway!'
                        });
                    } else {
                        ngToast.create("Unable to duplicate giveaway.");
                    }
                });
            };

            service.toggleGiveawayActiveState = (giveaway) => {
                if (giveaway == null) return;

                if (giveaway.active) {
                    giveaway.active = false;
                    backendCommunicator.fireEvent("unregisterGiveawayCommand", "firebot:giveaways:" + giveaway.id);
                } else {
                    giveaway.active = true;
                    backendCommunicator.fireEvent("registerGiveawayCommand", giveaway);
                }

                service.saveGiveaway(giveaway);
            };

            service.toggleGiveawayOpenState = (giveaway) => {
                if (giveaway == null) return;
                giveaway.isOpen = !giveaway.isOpen;
                service.saveGiveaway(giveaway);
            };

            service.deleteGiveaway = (giveawayId) => {
                service.giveaways = service.giveaways.filter(g => g.id !== giveawayId);
                backendCommunicator.fireEvent("deleteGiveaway", giveawayId);
            };

            service.showAddEditGiveawayModal = (giveaway) => {
                return new Promise(resolve => {
                    utilityService.showModal({
                        component: "addOrEditGiveawayModal",
                        size: "md",
                        resolveObj: {
                            giveaway: () => giveaway
                        },
                        closeCallback: response => {
                            resolve(response.giveaway);
                        }
                    });
                });
            };

            return service;
        });
}());
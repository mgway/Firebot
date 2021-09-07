"use strict";
(function() {
    angular
        .module("firebotApp")
        .controller("giveawaysController", function(
            $scope,
            giveawaysService,
            utilityService
        ) {
            $scope.giveawaysService = giveawaysService;

            $scope.onGiveawaysUpdated = (items) => {
                giveawaysService.saveAllGiveaways(items);
            };

            $scope.headers = [
                {
                    name: "NAME",
                    icon: "fa-user",
                    cellTemplate: `{{data.name}}`,
                    cellController: () => {}
                },
                {
                    name: "PRIZE",
                    icon: "fa-gift",
                    cellTemplate: `{{data.prize}}`,
                    cellControler: () => {}
                },
                {
                    name: "ENTRIES",
                    icon: "fa-th-list",
                    cellTemplate: `{{data.giveawayEntries ? data.giveawayEntries.length : 0}}`,
                    cellControler: () => {}
                },
                {
                    name: "WINNER",
                    icon: "fa-trophy",
                    cellTemplate: `{{data.winner ? data.winner : "-"}}`,
                    cellControler: () => {}
                },
                {
                    name: "OPEN/CLOSED",
                    icon: "fa-unlock",
                    cellTemplate: `<span class="status-dot" style="margin-right: 5px" ng-class="{'active': data.isOpen, 'closed': !data.isOpen}"></span>{{data.isOpen ? 'Open' : 'Closed' }}`,
                    cellControler: () => {}
                }
            ];

            $scope.giveawayOptions = (item) => {
                const options = [
                    {
                        html: `<a href ><i class="far fa-pen" style="margin-right: 10px;"></i> Edit</a>`,
                        click: () => {
                            giveawaysService.showAddEditGiveawayModal(item);
                        }
                    },
                    {
                        html: `<a href ><i class="far fa-toggle-off" style="margin-right: 10px;"></i> Toggle Open/Closed</a>`,
                        click: () => {
                            giveawaysService.toggleGiveawayOpenState(item);
                        }
                    },
                    {
                        html: `<a href ><i class="far fa-toggle-off" style="margin-right: 10px;"></i> Toggle Enabled</a>`,
                        click: () => {
                            giveawaysService.toggleGiveawayActiveState(item);
                        }
                    },
                    {
                        html: `<a href ><i class="far fa-clone" style="margin-right: 10px;"></i> Duplicate</a>`,
                        click: () => {
                            giveawaysService.duplicateGiveaway(item.id);
                        }
                    },
                    {
                        html: `<a href style="color: #fb7373;"><i class="far fa-trash-alt" style="margin-right: 10px;"></i> Delete</a>`,
                        click: () => {
                            utilityService
                                .showConfirmationModal({
                                    title: "Delete Giveaway",
                                    question: `Are you sure you want to delete the Giveaway "${item.name}"?`,
                                    confirmLabel: "Delete",
                                    confirmBtnType: "btn-danger"
                                })
                                .then(confirmed => {
                                    if (confirmed) {
                                        giveawaysService.deleteGiveaway(item.id);
                                    }
                                });

                        }
                    }
                ];

                return options;
            };
        });
}());

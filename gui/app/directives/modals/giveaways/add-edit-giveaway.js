"use strict";

(function() {
    const uuidv1 = require("uuid/v1");

    angular.module("firebotApp")
        .component("addOrEditGiveawayModal", {
            template: `
                <div class="modal-header">
                    <button type="button" class="close" ng-click="$ctrl.dismiss()"><span>&times;</span></button>
                    <h4 class="modal-title">{{$ctrl.isNewGiveaway ? 'Add Giveaway' : 'Edit Giveaway' }}</h4>
                </div>
                <div class="modal-body">
                    <div>
                        <h3>Name</h3>
                        <input type="text" class="form-control" placeholder="Enter name" ng-model="$ctrl.giveaway.name">
                    </div>
                    <div>
                        <h3>Prize to give away</h3>
                        <input type="text" class="form-control" placeholder="Enter name" ng-model="$ctrl.giveaway.prize">
                    </div>


                </div>
                <div class="modal-footer sticky-footer">
                <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">Cancel</button>
                <button type="button" class="btn btn-primary" ng-click="$ctrl.save()">Save</button>
            </div>
            `,
            bindings: {
                resolve: "<",
                close: "&",
                dismiss: "&",
                modalInstance: "<"
            },
            controller: function(ngToast, giveawaysService) {
                const $ctrl = this;

                $ctrl.isNewGiveaway = true;

                $ctrl.giveaway = {
                    name: "",
                    prize: "",
                    giveawayEntries: [],
                    winner: "",
                    isOpen: false,
                    active: true,
                    sortTags: []
                };

                $ctrl.$onInit = () => {
                    if ($ctrl.isNewGiveaway && $ctrl.giveaway.id == null) {
                        $ctrl.giveaway.id = uuidv1();
                    }
                };

                $ctrl.save = function() {
                    if ($ctrl.giveaway.name == null || $ctrl.giveaway.name === "") {
                        ngToast.create("Please provide a name for this Giveaway");
                        return;
                    }

                    if ($ctrl.giveaway.prize == null || $ctrl.giveaway.prize === "") {
                        ngToast.create("Please provide a prize for this Giveaway");
                        return;
                    }

                    giveawaysService.saveGiveaway($ctrl.giveaway).then(successful => {
                        if (successful) {
                            $ctrl.close({
                                $value: {
                                    giveaway: $ctrl.giveaway
                                }
                            });
                        } else {
                            ngToast.create("Failed to save giveaway. Please try again or view logs for details.");
                        }
                    });
                };
            }
        });
}());

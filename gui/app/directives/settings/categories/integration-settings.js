"use strict";

(function() {

    angular
        .module("firebotApp")
        .component("integrationSettings", {
            template: `
        <div class="row" style="margin-top: 30px">
            <div
              class="integration-row"
              ng-repeat="integration in integrations.getIntegrations()"
            >
              <div>
                <span><b>{{integration.name}}</b></span>
                <span class="muted" style="font-size: 13px; padding-left: 10px"
                  >{{integration.description}}</span
                >
              </div>
              <div>
                <button
                  class="btn btn-default"
                  ng-show="integration.configurable"
                  ng-click="integrations.openIntegrationSettings(integration.id)"
                >
                  Configure
                </button>
                <button
                  class="btn btn-default"
                  ng-show="integration.linkType === 'auth' || integration.linkType === 'id' || integration.linkType === 'other'"
                  ng-click="integrations.toggleLinkforIntegration(integration.id)"
                >
                  {{integrations.integrationIsLinked(integration.id) ? 'Unlink'
                  : 'Link'}}
                </button>
              </div>
            </div>
          </div>
          `,
            controller: function($scope, settingsService, integrationService) {
                $scope.settings = settingsService;

                $scope.integrations = integrationService;

            }
        });
}());

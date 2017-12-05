'use strict';
(function() {

    //This manages board data

    const fs = require('fs');
    const _ = require('underscore')._;
    const dataAccess = require('../../lib/common/data-access.js');
    const logger = require('../../lib/errorLogging.js');

    angular
        .module('firebotApp')
        .factory('boardService', function ($http, $q, settingsService, $rootScope, utilityService) {

            // in memory board storage
            let _boards = {};

            // factory/service object
            let service = {};

            let selectedBoard = {};

            let isloadingBoards = false;

            /**
            *  Private helper methods
            */

            // Emoji checker!
            // This checks a string for emoji and returns true if there are any...
            function isEmoji(str) {
                let ranges = [
                    '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
                    '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
                    '\ud83d[\ude80-\udeff]' // U+1F680 to U+1F6FF
                ];
                if (str.match(ranges.join('|'))) {
                    return true;
                }
                return false;

            }

            // Delete Board
            // This deletes the currently selected board on confirmation.
            function deleteBoard(boardId) {
                return $q.when(new Promise((resolve) => {

                    // Check for last board and load ui if one exists.
                    try {
                        let filepath = dataAccess.getPathInUserData('/user-settings/controls/' + boardId + '.json');

                        let exists = fs.existsSync(filepath);
                        if (exists) {
                            // File exists deleting
                            fs.unlink(filepath, function() {
                                resolve();
                            });
                        } else {
                            renderWindow.webContents.send('error', "Well this is weird. The board you tried to delete is already gone. Try restarting the app.");
                            console.log("This file doesn't exist, cannot delete");
                            resolve();
                        }
                    } catch (err) {
                        resolve();
                    }
                }));
            }

            // Backend Cleanup
            // This takes the mixer json and compares it against the Firebot json to remove any items no longer needed.
            function backendCleanup(dbControls) {
                return new Promise((resolve) => {

                    // Check if Firebot settings exist
                    try {

                        // We have saved settings. Time to clean up!
                        let mixerSettings = dbControls.getData('./mixer');
                        let firebotSettings = dbControls.getData('./firebot');


                        // Make an array containing all of the buttons and scenes from each json so we can compare.
                        let mixerButtonArray = [];
                        let firebotButtonArray = [];
                        let mixerSceneArray = [];
                        let firebotSceneArray = [];

                        // Add mixer stuff to mixer arrays for comparison.
                        for (let scene of mixerSettings) {
                            // Save Scenes
                            let sceneID = scene.sceneID;
                            mixerSceneArray.push(sceneID);

                            // Save Buttons
                            let controls = scene.controls;
                            for (let control of controls) {
                                let controlID = control.controlID;
                                mixerButtonArray.push(controlID);
                            }
                        }

                        // Add Firebot scenes to firebot array.
                        for (let scene in firebotSettings.scenes) {
                            if (firebotSettings.hasOwnProperty(scene)) {
                                firebotSceneArray.push(scene);
                            }
                        }

                        // Add Firebot buttons to firebot array for comparison.
                        for (let control in firebotSettings.controls) {
                            if (firebotSettings.controls.hasOwnProperty(control)) {
                                firebotButtonArray.push(control);
                            }
                        }

                        // Filter out all buttons that match. Anything left in the firebotButtonArray no longer exists on the mixer board.
                        firebotButtonArray = firebotButtonArray.filter(val => !mixerButtonArray.includes(val));

                        // Filter out all scenes that match. Anything left in the firebotScenenArray no longer exists on the mixer board.
                        firebotSceneArray = firebotSceneArray.filter(val => !mixerSceneArray.includes(val));

                        // Remove buttons that are no longer needed.
                        // If a scene was deleted from Mixer, the buttons for that scene should be gone as well.
                        for (let button of firebotButtonArray) {
                            try {
                                dbControls.delete('./firebot/controls/' + button);
                                console.log('Button ' + button + ' is not on the mixer board. Deleting.');

                                // Go through cooldown groups and remove the button if it is listed there.
                                for (let cooldown in firebotSettings.cooldownGroups) {
                                    if (firebotSettings.cooldownGroups.hasOwnProperty(cooldown)) {
                                        let cooldownButtons = dbControls.getData('./firebot/cooldownGroups/' + cooldown + '/buttons');
                                        let i = cooldownButtons.length;
                                        while (i--) {
                                            if (cooldownButtons[i] === button) {
                                                cooldownButtons.splice(i, 1);
                                                console.log('Removing ' + button + ' from cooldown group ' + cooldown + '.');
                                                break;
                                            }
                                        }

                                        // Push corrected cooldown array to db.
                                        dbControls.push('./firebot/cooldownGroups/' + cooldown + '/buttons', cooldownButtons);
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                            }
                        }

                        // Remove scenes that are no longer needed.
                        for (let scene of firebotSceneArray) {
                            try {
                                dbControls.delete('./firebot/scenes/' + scene);
                                console.log('Scene ' + scene + ' is not on the mixer board. Deleting.');
                            } catch (err) {
                                console.log(err);
                            }
                        }

                        resolve(true);
                    } catch (err) {
                        // We don't have any saved settings yet. Resolve this and don't cleanup anything.
                        console.log(err);
                        resolve(true);
                    }
                });
            }

            // Backend Controls Builder
            // This takes the mixer json and builds out the structure for the controls file.
            function backendBuilder(gameNameId, gameJsonInfo, gameUpdatedInfo, versionIdInfo, utilityService) {
                const gameName = gameNameId;
                const gameJson = gameJsonInfo;
                const gameUpdated = gameUpdatedInfo;
                const versionid = versionIdInfo;

                console.log('Backend builder is pushing settings to ' + gameName + ' (' + versionid + ').');

                // Pushing boardid: ${versionIdInfo} with ${gameUpdatedInfo} to settings/boards
                settingsService.setBoardLastUpdatedDatetimeById(versionIdInfo, gameName, gameUpdated);

                // If file is still based on game name, convert the filename to versionid format. This bit of code will be obsolete in a few versions.
                if (dataAccess.userDataPathExistsSync('/user-settings/controls/' + gameName + '.json')) {
                    console.log('Converting control files to new versionid format.');
                    let oldPath = dataAccess.getPathInUserData("/user-settings/controls/" + gameName + '.json');
                    let newPath = dataAccess.getPathInUserData("/user-settings/controls/" + versionid + '.json');

                    try {
                        fs.renameSync(oldPath, newPath);
                        logger.log('Converted control file ' + gameName + '.json to version id format.');
                    } catch (err) {
                        console.log(err);
                        logger.log('Error converting control file ' + gameName + '.json to version id format.');
                        utilityService.showErrorModal("Unable to convert controls file " + gameName + ".json to new format. Do you have the file open somewhere? If so, close it down and restart Firebot.");
                        return;
                    }
                }

                let dbControls = dataAccess.getJsonDbInUserData("/user-settings/controls/" + versionid);

                // Push mixer Json to controls file.
                dbControls.push('/gameName', gameName);
                dbControls.push('/versionid', parseInt(versionid));
                dbControls.push('/mixer', gameJson);

                // Cleanup Firebot Controls
                return backendCleanup(dbControls)
                    .then(() => {
                        let controlID;

                        // Build Firebot controls
                        for (let i = 0; i < gameJson.length; i++) {
                            let scenename = gameJson[i].sceneID;
                            let sceneControls = gameJson[i].controls;

                            // Loop through controls for this scene.
                            for (let a = 0; a < sceneControls.length; a++) {
                                let button = sceneControls[a];

                                // Try to get info for button. If there is nothing it errors out.
                                try {
                                    let type = button.kind;
                                    if (type === "button") {
                                        try {
                                            let emojitest = isEmoji(button.controlID);
                                            if (emojitest === false) {
                                                controlID = button.controlID;
                                            } else {
                                                utilityService.showErrorModal("Button: " + button.controlID + " has emoji in the button name. This will cause all buttons to become unresponsive on connecting. Please remove emoji from the button name field in the Mixer studio. Note that button text is what is visible to viewers, and it's fine to have emoji there.");
                                            }
                                        } catch (ignore) {} //eslint-disable-line no-empty

                                        let text, cost;
                                        try {
                                            text = button.text;
                                        } catch (ignore) {
                                            text = "None";
                                        }
                                        try {
                                            cost = button.cost;
                                        } catch (err) {
                                            cost = 0;
                                        }

                                        // Push to database
                                        /*
                                        // There is a reason for this one; Don't do it in a whole block
                                        // it will rewrite all custom actions even if you just change the spark cost on Mixer Studio
                                        // If we figure out a way to load the whole block, swap the new changes from mixer and save
                                        // it back in without altering custom actions then we can swap this for a whole push instead
                                        // of a singular one (Perry - 2017-06-28)
                                        */
                                        dbControls.push('./firebot/controls/' + controlID + '/controlId', controlID);
                                        dbControls.push('./firebot/controls/' + controlID + '/scene', scenename);
                                        dbControls.push('./firebot/controls/' + controlID + '/text', text);
                                        dbControls.push('./firebot/controls/' + controlID + '/cost', cost);
                                        dbControls.push('./firebot/controls/' + controlID + '/kind', type);
                                        dbControls.push('./firebot/controls/' + controlID + '/meta', button.meta);
                                    }


                                    if (type === "joystick") {
                                        let joystick = {
                                            controlID: button.controlID,
                                            sampleRate: button.sampleRate,
                                            scene: scenename,
                                            kind: type
                                        };
                                        dbControls.push(`./firebot/joysticks/${joystick.controlID}`, joystick);
                                    }

                                } catch (err) {
                                    console.log('Problem getting button info to save to json.');
                                }
                            }
                            // Setup scenes in Firebot json if they haven't been made yet.
                            try {
                                dbControls.getData('./firebot/scenes/' + scenename);
                            } catch (err) {
                                dbControls.push('./firebot/scenes/' + scenename + '/sceneName', scenename);
                                if (scenename !== "default") {
                                    dbControls.push('./firebot/scenes/' + scenename + '/default', ["None"]);
                                } else {
                                    dbControls.push('./firebot/scenes/' + scenename + '/default', []);
                                }
                            }
                        }
                    });
            }

            function loadBoardById(id) {
                return $http.get("https://mixer.com/api/v1/interactive/versions/" + id)
                    .then(function(response) {
                        let data = response.data;

                        if (data.controlVersion === "1.0") {
                            utilityService.showErrorModal("The board you're trying to load was created using Mixer Interactive v1. Please create a new board using Mixer Interactive v2.");
                            return;
                        }

                        try {
                            let gameUpdated = data.updatedAt;
                            let gameName = data.game.name;
                            let gameJson = data.controls.scenes;
                            let boardUpdated = null; // Prepare for data from settings/boards/boardId

                            try { // Checking if the data for this board is present in settings.json
                                boardUpdated = settingsService.getBoardLastUpdatedDatetimeById(id);

                                // If id is in settings, check to see if the actual file exists.
                                if (boardUpdated != null) {
                                    let boardExists = dataAccess.userDataPathExistsSync("/user-settings/controls/" + id + ".json");
                                    if (!boardExists) {
                                        console.log('Board was in settings, but the controls file is missing. Rebuilding.');
                                        return backendBuilder(gameName, gameJson, gameUpdated, id, utilityService);
                                    }
                                }

                                // If the board is up to date, OR if the file exists under the game name then run the backend builder.
                                if (boardUpdated !== gameUpdated) {
                                    console.log('Board updated. Rebuilding.');
                                    return backendBuilder(gameName, gameJson, gameUpdated, id, utilityService);
                                } // Date matches, no need to rebuild.

                            } catch (err) {
                                console.log(err);
                                // This board doesn't exist, recreate the board to get it into knownBoards
                                console.log(`Error occured, not able to find boardid ${id} in settings, build it`);
                                return backendBuilder(gameName, gameJson, gameUpdated, id, utilityService);
                            }
                        } catch (err) {
                            console.log('There was a problem loading this board!');
                            console.log(err);
                        }
                        // return backendBuilder(gameName, gameJson, gameUpdated, id);

                    });
            }

            function loadBoardsById(boardVersionIds, clearPreviousBoards) {

                //create a list of board load promises
                let boardLoadPromises = [];
                _.each(boardVersionIds, function(id) {
                    let promise = loadBoardById(id);
                    boardLoadPromises.push(promise);
                });

                //return a promise that will be resolved once all other promises have completed
                return Promise.all(boardLoadPromises).then(() => {
                    //clear out previously loaded boards
                    if (clearPreviousBoards === true) {
                        _boards = {};
                    }

                    let addedBoards = [];
                    // load each board
                    _.each(boardVersionIds, function (id) {
                        let boardDb = dataAccess.getJsonDbInUserData("/user-settings/controls/" + id);
                        let boardData = boardDb.getData('/');
                        try {
                            let board = boardData.firebot;
                            let versionId = board["versionId"] = boardData.versionid;
                            board["name"] = boardData.gameName;
                            board["versionid"] = boardData.versionid;
                            board['controls'] = boardData.firebot.controls || {};
                            board.getControlsForScene = function(sceneId) {
                                return _.where(this.controls, {scene: sceneId});
                            };
                            board['joysticks'] = boardData.firebot.joysticks || {};
                            board.getJoysticksForScene = function(sceneId) {
                                return _.where(this.joysticks, {scene: sceneId});
                            };
                            _boards[versionId] = board;
                            addedBoards.push(board);
                        } catch (err) {
                            console.log('Board ' + id + ' errored out while trying to load.');
                            console.log(err);
                            logger.log('Board ' + id + ' errored out while trying to load.');
                            logger.log(err);

                            // Remove the corrupted board from settings so we don't get stuck on next restart.
                            loadBoardById(id);
                        }
                    });

                    return $q.resolve(true, () => {
                        $rootScope.showSpinner = false;
                        return addedBoards;
                    });
                }, (error) => {
                    $rootScope.showSpinner = false;
                    return $q.reject(error);
                });
            }

            /**
            * Public methods
            */
            service.hasBoardsLoaded = function() {
                return _.keys(_boards).length > 0;
            };

            // Returns an array of the in-memory boards
            service.getAllBoards = function() {
                return _.values(_boards);
            };

            // Returns an array of names for the loaded boards
            service.getBoardNames = function() {
                let names = _.pluck(_boards, 'name');
                return names;
            };

            service.getBoardById = function(id) {
                return _boards[id];
            };

            service.getBoardByName = function(name) {
                return _.findWhere(_boards, {name: name});
            };

            service.getLastUsedBoard = function () {
                return service.getBoardById(settingsService.getLastBoardId());
            };

            service.getSelectedBoard = function() {
                return selectedBoard;
            };

            service.setSelectedBoard = function(board) {
                if (board != null && board.versionid != null) {
                    settingsService.setLastBoardId(board.versionid);
                }
                selectedBoard = board;
            };

            service.loadBoardWithId = function(id) {
                $rootScope.showSpinner = true;
                return loadBoardsById([id], false).then((boards) => {
                    let board = service.getBoardById(id);
                    if (board != null) {
                        service.setSelectedBoard(board);
                    }
                    return $q.resolve(true, () => {
                        return boards;
                    });
                });
            };

            service.deleteCurrentBoard = function() {
                let currentBoardId = service.getSelectedBoard().versionid;

                return deleteBoard(currentBoardId).then(() => {

                    // Remove last board setting entry
                    settingsService.deleteLastBoardId(currentBoardId);

                    delete _boards[currentBoardId];

                    let remainingBoards = Object.keys(_boards);

                    if (remainingBoards.length < 1) {
                        service.setSelectedBoard(null);
                    } else {
                        let key = remainingBoards[0];
                        service.setSelectedBoard(_boards[key]);
                    }

                });
            };

            service.isloadingBoards = function() {
                return isloadingBoards;
            };

            // reload boards into memory
            service.loadAllBoards = function() {
                isloadingBoards = true;

                let knownBoards, boardVersionIds;

                /* Step 1 */
                // Get a list or board ids so we can resync them all with Mixer
                knownBoards = settingsService.getKnownBoards();

                if (knownBoards !== null && knownBoards !== undefined) {
                    boardVersionIds = [];
                    _.each(knownBoards, function(board) {
                        boardVersionIds.push(board.boardId);
                    });
                    /* Step 2 */
                    // Load each board.
                    return loadBoardsById(boardVersionIds, true).then(() => {
                        isloadingBoards = false;
                        selectedBoard = service.getLastUsedBoard();
                    });
                }

                isloadingBoards = false;
                return Promise.resolve();
            };

            service.saveControlForCurrentBoard = function(control) {
                let boardDb = dataAccess.getJsonDbInUserData("/user-settings/controls/" + settingsService.getLastBoardId());

                // Note(ebiggz): Angular sometimes adds properties to objects for the purposes of two way bindings
                // and other magical things. Angular has a .toJson() convienence method that coverts an object to a json string
                // while removing internal angular properties. We then convert this string back to an object with
                // JSON.parse. It's kinda hacky, but it's an easy way to ensure we arn't accidentally saving anything extra.
                let cleanedControl = JSON.parse(angular.toJson(control));

                boardDb.push("./firebot/controls/" + control.controlId, cleanedControl);

                // Refresh the interactive control cache.
                ipcRenderer.send('refreshInteractiveCache');
            };

            service.saveSceneForCurrentBoard = function(scene) {
                let boardDb = dataAccess.getJsonDbInUserData("/user-settings/controls/" + settingsService.getLastBoardId());

                // Note(ebiggz): Angular sometimes adds properties to objects for the purposes of two way bindings
                // and other magical things. Angular has a .toJson() convienence method that coverts an object to a json string
                // while removing internal angular properties. We then convert this string back to an object with
                // JSON.parse. It's kinda hacky, but it's an easy way to ensure we arn't accidentally saving anything extra.
                let cleanedScene = JSON.parse(angular.toJson(scene));

                boardDb.push("./firebot/scenes/" + scene.sceneName, cleanedScene);

                service.getSelectedBoard().scenes[scene.sceneName] = scene;

                // Refresh the interactive control cache.
                ipcRenderer.send('refreshInteractiveCache');

            };

            service.saveCooldownGroupForCurrentBoard = function(previousName, cooldownGroup) {

                if (previousName != null && previousName !== '') {
                    service.deleteCooldownGroupForCurrentBoard(previousName, cooldownGroup);
                }


                let boardDb = dataAccess.getJsonDbInUserData("/user-settings/controls/" + settingsService.getLastBoardId());

                // Note(ebiggz): Angular sometimes adds properties to objects for the purposes of two way bindings
                // and other magical things. Angular has a .toJson() convienence method that coverts an object to a json string
                // while removing internal angular properties. We then convert this string back to an object with
                // JSON.parse. It's kinda hacky, but it's an easy way to ensure we arn't accidentally saving anything extra.
                let cleanedCooldownGroup = JSON.parse(angular.toJson(cooldownGroup));

                if (cleanedCooldownGroup.buttons != null) {
                    cleanedCooldownGroup.buttons.forEach((buttonName) => {
                        boardDb.push(`./firebot/controls/${buttonName}/cooldownGroup`, cooldownGroup.groupName);
                    });
                }

                boardDb.push("./firebot/cooldownGroups/" + cooldownGroup.groupName, cleanedCooldownGroup);

                if (service.getSelectedBoard().cooldownGroups == null) {
                    service.getSelectedBoard().cooldownGroups = {};
                }

                service.getSelectedBoard().cooldownGroups[cooldownGroup.groupName] = cleanedCooldownGroup;

                // Refresh the interactive control cache.
                ipcRenderer.send('refreshInteractiveCache');

                //TODO: propigate cooldown group to related buttons
            };

            service.deleteCooldownGroupForCurrentBoard = function(cooldownGroupName, cooldownGroup) {
                let boardDb = dataAccess.getJsonDbInUserData("/user-settings/controls/" + settingsService.getLastBoardId());

                if (cooldownGroup.buttons != null) {
                    cooldownGroup.buttons.forEach((buttonName) => {
                        boardDb.delete(`./firebot/controls/${buttonName}/cooldownGroup`);
                    });
                }

                boardDb.delete("./firebot/cooldownGroups/" + cooldownGroupName);

                delete service.getSelectedBoard().cooldownGroups[cooldownGroupName];

                // Refresh the interactive control cache.
                ipcRenderer.send('refreshInteractiveCache');
            };

            service.deleteViewerGroupFromAllBoards = function(viewerGroup) {
                let boards = service.getAllBoards();
                // interate through each saved board
                boards.forEach((board) => {
                    let scenes = Object.keys(board.scenes).map(k => board.scenes[k]);
                    // interate through each scene in a board
                    scenes.forEach((scene) => {
                        let groups = scene.default;
                        let index = groups.indexOf(viewerGroup);
                        // check if this group is saved as a scene default
                        if (index !== -1) {
                            // remove from array
                            groups.splice(index, 1);
                            //save to file
                            let boardDb = dataAccess.getJsonDbInUserData(`/user-settings/controls/${board.name}`);
                            boardDb.push(`./firebot/scenes/${scene.sceneName}/default`, groups);
                        }
                    });
                });

                // Refresh the backend cache
                ipcRenderer.send('refreshInteractiveCache');
                ipcRenderer.send('refreshCommandCache');
            };

            service.getScenesForSelectedBoard = function () {
                let board = service.getLastUsedBoard();
                let scenes = [];
                if (board != null) {
                    scenes = Object.keys(board.scenes);
                }
                return scenes;
            };

            service.getControlIdsForSelectedBoard = function () {
                let board = service.getLastUsedBoard();
                let controls = [];
                if (board != null) {
                    controls = Object.keys(board.controls);
                }
                return controls;
            };

            return service;
        });
}());

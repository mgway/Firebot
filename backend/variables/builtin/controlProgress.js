"use strict";

const {
    EffectTrigger
} = require("../../effects/models/effectModels");

const { OutputDataType } = require("../../../shared/variable-contants");
const { ControlKind } = require('../../interactive/constants/MixplayConstants');

let triggers = {};
triggers[EffectTrigger.INTERACTIVE] = [ControlKind.BUTTON];

const model = {
    definition: {
        handle: "controlProgress",
        description: "The control's progress bar percentage.",
        triggers: triggers,
        possibleDataOutput: [OutputDataType.NUMBER]
    },
    evaluator: (trigger) => {
        let progress = trigger.metadata.control.progress;
        return progress ? progress * 100 : 0;
    }
};

module.exports = model;
'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const label_matcher_1 = require("./label-matcher");
// This is the most important default action: it is called
// when a new key is entered (or backed from -- in essence,
// when currently entered keys change) and automatically
// transition to partial_match/no_match state.
//
// filterLabels is used under the hood for actual label key
// matching.
//
const applyKeys = (data, event, { dispatch }) => {
    const nextData = label_matcher_1.filterLabels(data);
    const { visibleLabels: { length: n0 } } = data;
    const { config: { numKeys }, keys: { length: nKeys }, visibleLabels: { length: n1 }, } = nextData;
    if (event.type === 'BACK') {
        dispatch(Object.assign({}, event, { type: 'MATCH' }));
    }
    else if (n1 === 1 && nKeys === numKeys) {
        const label = nextData.visibleLabels[0];
        // we want to key original keys information in jump
        // event in order to be able to handle complex
        // combination (ctrl key in tab view)
        dispatch(Object.assign({}, event, { type: 'JUMP', label }));
        return nextData;
    }
    else if (n1 === 0 || n1 >= n0) {
        // no match
        dispatch(Object.assign({}, event, { type: 'NO_MATCH' }));
        return Object.assign({}, nextData, { keys: data.keys, visibleLabels: data.visibleLabels, hiddenLabels: data.hiddenLabels });
    }
    else {
        dispatch(Object.assign({}, event, { type: 'MATCH' }));
    }
    return nextData;
};
const statusActions = {
    statusIdle: () => { },
    statusClear: () => { },
    statusMatch: () => { },
    statusNoMatch: () => { },
};
const ifStatusEnabled = ({}, handler) => (data, event) => {
    const { config: { statusBar } } = data;
    if (statusBar) {
        return handler(data, event);
    }
};
const statusWrappers = Object.keys(statusActions)
    .reduce((wrappers, action) => {
    wrappers[action] = ifStatusEnabled;
    return wrappers;
}, {});
const callbackActions = {
    setCallbacks: (data, { onJump, onCancel }) => (Object.assign({}, data, { callbacks: { onJump, onCancel } })),
    clearCallbacks: (data) => (Object.assign({}, data, { callbacks: {} })),
};
const keyActions = {
    pushKey: (data, { key }) => (Object.assign({}, data, { keys: [...data.keys, key] })),
    popKey: (data) => (Object.assign({}, data, { keys: [...data.keys.slice(0, -1)] })),
    resetKeys: (data) => (Object.assign({}, data, { keys: [] })),
};
exports.defaultActions = Object.assign({ setConfig: (data, { config }) => (Object.assign({}, data, { config })) }, statusActions, callbackActions, keyActions, { applyKeys, resetLabels: (data) => (Object.assign({}, data, { visibleLabels: data.labels, hiddenLabels: [] })), maybeFlashNoMatch: (data, event, utils) => {
        const { getHandler } = utils;
        if (data.config.flashNoMatch) {
            const handler = getHandler('flashNoMatch');
            if (handler) {
                return handler(data, event, utils);
            }
        }
    }, maybeAnimateBeacon: (data, event, utils) => {
        const { getHandler } = utils;
        if (data.config.useHomingBeaconEffectOnJumps) {
            const handler = getHandler('animateBeacon');
            if (handler) {
                return handler(data, event, utils);
            }
        }
    } });
exports.actionWrappers = Object.assign({}, statusWrappers, { jump: ({}, handler) => (data, event) => {
        const { onJump } = data.callbacks;
        if (onJump) {
            const abort = onJump(event) === false;
            if (abort) {
                return;
            }
        }
        return handler(data, event);
    } });
//# sourceMappingURL=state-machine-actions.js.map
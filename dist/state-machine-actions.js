'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const label_matcher_1 = require("./label-matcher");
const applyKeys = (data, event, { dispatch }) => {
    const nextData = label_matcher_1.filterLabels(data);
    const { visibleLabels: { length: n0 } } = data;
    const { config: { numKeys }, keys: { length: nKeys }, visibleLabels: { length: n1 }, } = nextData;
    if (event.type === 'BACK') {
        dispatch(Object.assign({}, event, { type: 'MATCH' }));
    }
    else if (n1 === 1 && nKeys === numKeys) {
        const label = nextData.visibleLabels[0];
        dispatch({ type: 'JUMP', label });
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
const callbackActions = {
    setCallbacks: (data, { onJump, onCancel }) => (Object.assign({}, data, { callbacks: { onJump, onCancel } })),
    clearCallbacks: (data) => (Object.assign({}, data, { callbacks: {} })),
};
const keyActions = {
    pushKey: (data, { key }) => (Object.assign({}, data, { keys: [...data.keys, key] })),
    popKey: (data) => (Object.assign({}, data, { keys: [...data.keys.slice(0, -1)] })),
    resetKeys: (data) => (Object.assign({}, data, { keys: [] })),
};
exports.defaultActions = Object.assign({}, statusActions, callbackActions, keyActions, { applyKeys, resetLabels: (data) => (Object.assign({}, data, { visibleLabels: data.labels, hiddenLabels: [] })), maybeFlashNoMatch: (data, event, utils) => {
        const { getHandler } = utils;
        if (data.config.flashNoMatch) {
            const handler = getHandler('flashNoMatch');
            if (handler) {
                return handler(data, event, utils);
            }
        }
    } });
exports.actionWrappers = {
    jump: ({}, handler) => (data, event) => {
        const { onJump } = data.callbacks;
        if (onJump) {
            const abort = onJump(event) === false;
            if (abort) {
                return;
            }
        }
        return handler(data, event);
    }
};
//# sourceMappingURL=state-machine-actions.js.map
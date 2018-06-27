'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xstate_1 = require("xstate");
const util_1 = require("./state-machine/util");
const label_matcher_1 = require("./label-matcher");
const refreshLabels = ['filterLabels', 'updateLabels'];
const fsm = xstate_1.Machine({
    key: 'jumpy',
    initial: 'idle',
    strict: true,
    states: {
        idle: {
            on: {
                ACTIVATE: 'input',
            },
        },
        input: {
            onEntry: ['resetKeys', 'focus', 'grabKeyboard', 'createLabels'],
            onExit: ['blur', 'releaseKeyboard', 'destroyLabels', 'statusIdle'],
            on: {
                CANCEL: 'idle',
                RESET: { '.first_key': { actions: ['resetKeys', ...refreshLabels] } },
                JUMP: [
                    { target: 'idle', actions: ['jump'] },
                ],
                NO_MATCH: { '.no_match': { actions: ['statusNoMatch'] } },
                MATCH: { '.partial_match': { actions: ['statusMatch'] } },
            },
            initial: 'first_key',
            states: {
                first_key: {
                    on: {
                        KEY: { first_key: { actions: ['pushKey', ...refreshLabels] } },
                        BACK: '#jumpy.idle',
                    },
                },
                partial_match: {
                    on: {
                        KEY: { partial_match: { actions: ['pushKey', ...refreshLabels] } },
                        BACK: [{
                                target: 'first_key',
                                actions: ['resetKeys', ...refreshLabels],
                                cond: ({ keys }) => keys.length - 1 === 0,
                            }, {
                                target: 'partial_match',
                                actions: ['popKey', ...refreshLabels],
                            }],
                    },
                },
                no_match: {
                    on: {
                        KEY: { no_match: { actions: ['popKey', 'pushKey', ...refreshLabels] } },
                        BACK: [{
                                target: 'first_key',
                                actions: ['resetKeys', ...refreshLabels],
                                cond: ({ keys }) => keys.length - 1 === 0,
                            }, {
                                target: 'no_match',
                                actions: ['popKey', 'popKey', ...refreshLabels],
                            }],
                    },
                },
            },
        },
    },
});
const defaultActions = {
    pushKey: (data, { key }) => (Object.assign({}, data, { keys: [...data.keys, key] })),
    popKey: (data) => (Object.assign({}, data, { keys: [...data.keys.slice(0, -1)] })),
    resetKeys: (data) => (Object.assign({}, data, { keys: [] })),
};
const actionWrappers = {
    filterLabels: (dispatch, handler) => (data, event) => {
        const { visibleLabels: { length: n0 } } = data;
        // if filterLabels is provided in adapter, it completely
        // overrides filtering logic (only)
        const actualFilterLabels = handler || label_matcher_1.filterLabels;
        const newData = actualFilterLabels(data, event);
        const { config: { numKeys }, keys: { length: nKeys }, visibleLabels: { length: n1 }, } = newData;
        if (nKeys > 0) {
            if (n1 === 1 && nKeys === numKeys) {
                const label = newData.visibleLabels[0];
                dispatch({ type: 'JUMP', label });
            }
            else if (n0 <= n1) {
                dispatch(Object.assign({}, event, { type: 'NO_MATCH' }));
            }
            else {
                dispatch(Object.assign({}, event, { type: 'MATCH' }));
            }
        }
        return newData;
    }
};
const ApiSpec = ({ dispatch }) => ({
    activate: 'ACTIVATE',
    back: 'BACK',
    reset: 'RESET',
    cancel: 'CANCEL',
    key: key => {
        dispatch({ type: 'KEY', key });
    },
});
const Data = (config) => ({
    config,
    keys: [],
    labels: [],
    hiddenLabels: [],
    visibleLabels: [],
});
// lower level than Api, useful for testing
exports.createStateMachine = ({ config, adapter }) => util_1.createStatefulMachine({
    fsm,
    defaultActions,
    actionWrappers,
    adapter,
    ApiSpec,
    data: Data(config),
});
exports.createStateMachineApi = params => exports.createStateMachine(params).api;
//# sourceMappingURL=state-machine.js.map
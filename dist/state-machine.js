'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xstate_1 = require("xstate");
const stateful_machine_1 = require("./util/stateful-machine");
const state_machine_actions_1 = require("./state-machine-actions");
const reset = ['resetKeys', 'resetLabels', 'statusClear'];
const fsm = xstate_1.Machine({
    key: 'jumpy',
    initial: 'idle',
    strict: true,
    states: {
        idle: {
            onEntry: ['clearCallbacks'],
            on: {
                ACTIVATE: 'input',
                SET_CONFIG: { idle: { actions: ['setConfig'] } },
            },
        },
        input: {
            onEntry: [
                'setCallbacks',
                ...reset,
                'focus',
                'grabKeyboard',
                'createLabels',
            ],
            onExit: [
                'blur',
                'releaseKeyboard',
                'destroyLabels',
                'statusIdle',
            ],
            on: {
                SET_CONFIG: { input: { actions: ['setConfig'] } },
                CANCEL: 'idle',
                RESET: { '.wait_key': { actions: [...reset, 'updateLabels'] } },
                KEY: { '.new_key': { actions: ['pushKey'] } },
                BACK: [{
                        target: '.wait_key',
                        actions: [...reset, 'updateLabels'],
                        cond: ({ keys }) => keys.length === 1,
                    }, {
                        target: '.new_key',
                        actions: ['popKey'],
                        cond: ({ keys }) => keys.length > 0,
                    }, {
                        target: 'idle',
                    }],
                NO_MATCH: '.no_match',
                MATCH: '.partial_match',
                JUMP: { idle: { actions: ['maybeAnimateBeacon', 'jump'] } },
            },
            initial: 'wait_key',
            states: {
                wait_key: {},
                // applyKey will reroute to partial_match/no_match
                new_key: {
                    onEntry: ['applyKeys'],
                },
                no_match: {
                    onEntry: [
                        'popKey',
                        'maybeFlashNoMatch',
                        'updateLabels',
                        'statusNoMatch',
                    ],
                },
                partial_match: {
                    onEntry: ['updateLabels', 'statusMatch'],
                }
            },
        },
    },
});
const ApiSpec = ({ dispatch }) => ({
    setConfig: (config) => {
        dispatch({ type: 'SET_CONFIG', config });
    },
    activate: (onJump, onCancel) => {
        dispatch({ type: 'ACTIVATE', onJump, onCancel });
    },
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
    callbacks: {},
});
// lower level than Api, useful for testing
exports.createStateMachine = ({ config, adapter }) => stateful_machine_1.createStatefulMachine({
    fsm,
    defaultActions: state_machine_actions_1.defaultActions,
    actionWrappers: state_machine_actions_1.actionWrappers,
    adapter,
    ApiSpec,
    data: Data(config),
});
//# sourceMappingURL=state-machine.js.map
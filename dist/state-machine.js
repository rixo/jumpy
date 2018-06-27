'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xstate_1 = require("xstate");
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
            onEntry: ['grabKeyboard', 'createLabels'],
            onExit: ['releaseKeyboard', 'destroyLabels', 'statusIdle'],
            on: {
                CANCEL: 'idle',
                RESET: { '.first_key': { actions: ['resetKeys', 'filterLabels'] } },
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
                        // BACK: '#jumpy.idle',
                        KEY: { first_key: { actions: ['pushKey', 'filterLabels'] } },
                    },
                },
                partial_match: {
                    on: {
                        KEY: { partial_match: { actions: ['pushKey', 'filterLabels'] } },
                    },
                },
                no_match: {
                    on: {
                        KEY: { no_match: { actions: ['popKey', 'pushKey', 'filterLabels'] } },
                    },
                },
            },
        },
    },
});
exports.createStateMachine = ({ numKeys = 2, adapter, }) => {
    let state = fsm.initialState;
    let data = {
        numKeys,
        keys: [],
        labels: [],
        hiddenLabels: [],
        visibleLabels: [],
    };
    // We want to keep our dispatch chain synchronous.
    //
    // For example, api.key() transisions by emitting KEY event, that in turn
    // fires filterLabels action, in which we will emit MATCH/NO_MATCH/JUMP. This
    // will trigger a transition from current state to partial_match/no_match.
    //
    // Here's an example dispatch chain that we get:
    //
    //     KEY@first_key -> MATCH@first_key -> partial_match
    //
    // We won't have "background" treatments, like downloading, in Jumpy. On
    // the contrary, this state machine is just for UI actions that we would
    // want instantaneous. So we don't want to needlessly introduce complexity
    // by making api.* methods or dispatch return asynchronously.
    //
    const dispatch = event => {
        console.log('dispatch', event);
        state = fsm.transition(state, event);
        data = processActions(adapter, state, data, event, dispatch);
    };
    const api = dispatcher(dispatch, {
        getState: () => state.value,
        getFirstState: () => getFirstPath(state.value),
        activate: 'ACTIVATE',
        back: 'BACK',
        reset: 'RESET',
        cancel: 'CANCEL',
        key: key => {
            dispatch({ type: 'KEY', key });
        },
    });
    return api;
};
const dispatcher = (dispatch, o) => {
    Object.entries(o).forEach(([method, handler]) => {
        if (typeof handler === 'string') {
            o[method] = () => {
                dispatch(handler);
            };
        }
    });
    return o;
};
const defaultActions = {
    pushKey: (state, { key }) => (Object.assign({}, state, { keys: [...state.keys, key] })),
    popKey: (state) => (Object.assign({}, state, { keys: [...state.keys.slice(0, -1)] })),
    resetKeys: (state) => (Object.assign({}, state, { keys: [] })),
};
const actionWrappers = {
    filterLabels: (dispatch, handler) => (data, event) => {
        const { visibleLabels: { length: n0 } } = data;
        const newData = handler(data, event);
        const { keys: { length: nKeys }, numKeys, visibleLabels: { length: n1 }, } = newData;
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
    }
};
const processActions = (adapter, state, data, event, dispatch) => {
    for (const action of state.actions) {
        if (typeof action !== 'string') {
            throw new Error('Unsuppoted action type: ' + typeof action);
        }
        let handler = adapter[action] || defaultActions[action];
        const wrapper = actionWrappers[action];
        if (wrapper) {
            handler = wrapper(dispatch, handler);
        }
        if (!handler) {
            throw new Error('Missing handler for action: ' + action);
        }
        const result = handler(data, event);
        if (result !== undefined) {
            data = result;
        }
    }
    return data;
};
const getFirstPath = obj => {
    let cursor = obj;
    const steps = [];
    while (typeof cursor === 'object') {
        const entry = Object.entries(cursor)[0];
        if (!entry) {
            break;
        }
        const [step, next] = entry;
        steps.push(step);
        cursor = next;
    }
    if (typeof cursor === 'string') {
        steps.push(cursor);
    }
    return steps.join('.');
};
//# sourceMappingURL=state-machine.js.map
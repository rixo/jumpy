/**
 * Creates a factory object that is used to keep a Jumpy state machine
 * (becoming a Atom Jumpy state machine for the occasion) in sync with
 * Atom's config and available services (statusBar...).
 */
'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const state_machine_1 = require("../state-machine");
const adapter_keyboard_1 = require("./adapter-keyboard");
const adapter_labels_1 = require("./adapter-labels");
const adapter_status_1 = require("./adapter-status");
const adapter_focus_1 = require("./adapter-focus");
const createAdapter = ({ statusBar, onBlur, onKey }) => {
    const focus = adapter_focus_1.default();
    const keyboard = adapter_keyboard_1.default({ onBlur, onKey });
    const labels = adapter_labels_1.default();
    const { adapter: status = {}, destroy: destroyStatus = () => { }, } = statusBar && adapter_status_1.default(statusBar) || {};
    const adapter = Object.assign({}, focus, keyboard, labels, status || {});
    const destroy = () => {
        destroyStatus();
    };
    return { adapter, destroy };
};
// Recreates the state machine when needed, using the last config
// and status bar service.
exports.createFactory = () => {
    let lastConfig = null;
    let statusBar = null;
    let stateMachine = null;
    let adapter = null;
    const setConfig = config => {
        lastConfig = config;
        stateMachine = null;
    };
    const setStatusBar = bar => {
        statusBar = bar;
        stateMachine = null;
    };
    const getStateMachine = () => {
        if (!stateMachine) {
            createMachine();
        }
        if (!stateMachine) {
            throw new Error('Config must be initialized first');
        }
        return stateMachine;
    };
    const createMachine = () => {
        const config = config_1.parseConfig(lastConfig);
        const bridge = {
            onBlur: () => api.cancel(),
            onKey: key => api.key(key),
        };
        adapter = createAdapter(Object.assign({ statusBar }, bridge));
        stateMachine = state_machine_1.createStateMachine({ config, adapter: adapter.adapter });
        const { api } = stateMachine;
    };
    const withStateMachine = fn => (...args) => fn(getStateMachine(), ...args);
    const dispose = () => {
        adapter.destroy();
        lastConfig = stateMachine = adapter = null;
    };
    const disposable = { dispose };
    return {
        setConfig,
        setStatusBar,
        getStateMachine,
        withStateMachine,
        disposable,
    };
};
//# sourceMappingURL=atom-state-machine.js.map
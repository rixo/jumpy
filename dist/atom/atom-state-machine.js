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
const adapter_1 = require("./atom-state-machine/adapter");
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
        adapter = adapter_1.createAdapter(Object.assign({ statusBar }, bridge));
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
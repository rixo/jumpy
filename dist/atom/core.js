'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const state_machine_1 = require("../state-machine");
const config_1 = require("../config");
const keyboard_adapter_1 = require("./keyboard-adapter");
const label_adapter_1 = require("./label-adapter");
const status_adapter_1 = require("./status-adapter");
const configKeyPath = 'jumpy';
const createAdapter = ({ config, statusBar, onBlur, onKey }) => {
    const keyboard = keyboard_adapter_1.default({ onBlur, onKey });
    const labels = label_adapter_1.default(config);
    const { adapter: status = {}, destroy: destroyStatus = () => { }, } = statusBar && status_adapter_1.default(statusBar) || {};
    const adapter = Object.assign({}, keyboard, labels, status || {}, { focus: () => {
            const workspaceEl = atom.views.getView(atom.workspace);
            workspaceEl.classList.add('jumpy-jump-mode');
        }, blur: () => {
            const workspaceEl = atom.views.getView(atom.workspace);
            workspaceEl.classList.remove('jumpy-jump-mode');
        } });
    const destroy = () => {
        destroyStatus();
    };
    return { adapter, destroy };
};
const createStateMachineCache = () => {
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
        adapter = createAdapter(Object.assign({ config, statusBar }, bridge));
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
exports.default = () => {
    const stateMachineCache = createStateMachineCache();
    const { setConfig, setStatusBar, getStateMachine, withStateMachine, disposable: smcDisposable, } = stateMachineCache;
    let disposable;
    const activate = () => {
        disposable = new atom_1.CompositeDisposable();
        disposable.add(addCommands());
        disposable.add(observeConfig());
        disposable.add(smcDisposable);
        // be ready for next command (from my observations, should have
        // already been done by observeConfig but let's be double sure here)
        setConfig(atom.config.get(configKeyPath));
    };
    const deactivate = () => {
        disposable.dispose();
        disposable = null;
    };
    const addCommands = () => atom.commands.add('atom-workspace', {
        [`jumpy:toggle`]: withStateMachine(({ api }) => api.activate()),
        [`jumpy:back`]: withStateMachine(({ api }) => api.back()),
        [`jumpy:reset`]: withStateMachine(({ api }) => api.reset()),
        [`jumpy:clear`]: withStateMachine(({ api }) => api.cancel()),
    });
    const observeConfig = () => atom.config.observe(configKeyPath, setConfig);
    return {
        setStatusBar,
        activate,
        deactivate,
        // for tests
        getStateMachine,
    };
};
//# sourceMappingURL=core.js.map
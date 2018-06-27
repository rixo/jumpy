'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const state_machine_1 = require("../state-machine");
const config_1 = require("../config");
const keyboard_1 = require("./keyboard");
const labels_1 = require("./labels");
const configKeyPath = 'jumpy';
const Adapter = ({ config, onBlur, onKey }) => {
    const keyboard = keyboard_1.default({ onBlur, onKey });
    const labels = labels_1.default(config);
    return Object.assign({}, keyboard, labels, { focus: () => {
            const workspaceEl = atom.views.getView(atom.workspace);
            workspaceEl.classList.add('jumpy-jump-mode');
        }, blur: () => {
            const workspaceEl = atom.views.getView(atom.workspace);
            workspaceEl.classList.remove('jumpy-jump-mode');
        }, jump: (data, { label }) => {
            const { config: { useHomingBeaconEffectOnJumps } } = data;
            if (useHomingBeaconEffectOnJumps) {
                label.animateBeacon();
            }
            label.jump();
        }, statusIdle: () => console.log('statusIdle'), statusMatch: () => console.log('statusMatch'), statusNoMatch: () => console.log('statusNoMatch') });
};
const createStateMachineCache = () => {
    let lastConfig = null;
    let stateMachine = null;
    let adapter = null;
    const setConfig = config => { lastConfig = config; };
    const getStateMachine = () => {
        if (lastConfig) {
            const config = config_1.parseConfig(lastConfig);
            lastConfig = null;
            createParts(config);
        }
        if (!stateMachine) {
            throw new Error('Config must be initialized first');
        }
        return stateMachine;
    };
    const createParts = (config) => {
        const bridge = {
            onBlur: () => api.cancel(),
            onKey: key => api.key(key),
        };
        adapter = Adapter(Object.assign({ config }, bridge));
        stateMachine = state_machine_1.createStateMachine({ config, adapter });
        const { api } = stateMachine;
    };
    const withStateMachine = fn => (...args) => fn(getStateMachine(), ...args);
    const dispose = () => {
        lastConfig = stateMachine = adapter = null;
    };
    const disposable = { dispose };
    return {
        setConfig,
        withStateMachine,
        disposable,
        // for tests
        get adapter() { return adapter; },
        get stateMachine() { return stateMachine; },
    };
};
exports.default = () => {
    const stateMachineCache = createStateMachineCache();
    const { setConfig, withStateMachine, disposable: smcDisposable, } = stateMachineCache;
    let disposable;
    return {
        activate,
        deactivate,
        // for tests
        stateMachineCache,
    };
    function activate() {
        disposable = new atom_1.CompositeDisposable();
        disposable.add(addCommands());
        disposable.add(observeConfig());
        disposable.add(smcDisposable);
        // be ready for next command (from my observations, should have
        // already been done by observeConfig but let's be double sure here)
        setConfig(atom.config.get(configKeyPath));
    }
    function deactivate() {
        disposable.dispose();
        disposable = null;
    }
    function addCommands() {
        return atom.commands.add('atom-workspace', {
            [`${configKeyPath}:toggle`]: withStateMachine(({ api }) => api.activate()),
            [`${configKeyPath}:back`]: withStateMachine(({ api }) => api.back()),
            [`${configKeyPath}:reset`]: withStateMachine(({ api }) => api.reset()),
            [`${configKeyPath}:clear`]: withStateMachine(({ api }) => api.cancel()),
        });
    }
    function observeConfig() {
        return atom.config.observe(configKeyPath, setConfig);
    }
};
//# sourceMappingURL=core.js.map
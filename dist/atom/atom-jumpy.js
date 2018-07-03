/**
 * This is the implementation of the actual Atom "package object".
 *
 * We don't expose this directyl to Atom to allow for lazy loading
 * of this module and all its dependencies from the actual package
 * module.
 */
'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const atom_state_machine_1 = require("./atom-state-machine");
const configKeyPath = 'jumpy';
exports.default = () => {
    const { setConfig, setStatusBar, getStateMachine, withStateMachine, disposable: smDisposable, } = atom_state_machine_1.createFactory();
    let disposable;
    const activate = () => {
        disposable = new atom_1.CompositeDisposable();
        disposable.add(addCommands());
        disposable.add(observeConfig());
        // state machine disposable can be reused
        disposable.add(smDisposable);
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
//# sourceMappingURL=atom-jumpy.js.map
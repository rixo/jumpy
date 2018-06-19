'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// TODO: Merge in @johngeorgewright's code for treeview
// TODO: Merge in @willdady's code for better accuracy.
/* global atom */
const atom_1 = require("atom");
const _ = require("lodash");
const words_1 = require("./labelers/words");
const tabs_1 = require("./labelers/tabs");
const settings_1 = require("./labelers/settings");
const tree_view_1 = require("./labelers/tree-view");
const StateMachine = require("javascript-state-machine");
const keys_1 = require("./keys");
const viewHelpers_1 = require("./viewHelpers");
const marker_manager_1 = require("./marker-manager");
const $$$ = fn => fn();
const concatAll = (a, b) => a.concat(b);
const hasKeyLabel = label => label.keyLabel;
class JumpyView {
    constructor() {
        this.keyEventsElement = document.body;
        this.disposables = new atom_1.CompositeDisposable();
        this.commands = new atom_1.CompositeDisposable();
        this.resetCallbacks();
        // "setup" theme
        document.body.classList.add('jumpy-theme-vimium');
        // With smartCaseMatch, test is case-insensitive when there is no
        // ambiguity (i.e. all next possible target chars are lowercase or
        // they all are uppercase).
        const createTest = $$$(() => {
            const lc = s => s.toLowerCase();
            const uc = s => s.toUpperCase();
            return (character) => {
                const testIndex = this.currentKeys.length;
                if (this.settings.smartCaseMatch) {
                    const lcChar = lc(character);
                    const ucChar = uc(character);
                    const hasUpperCase = this.currentLabels.some(({ keyLabel }) => keyLabel[testIndex] === ucChar);
                    const hasLowerCase = this.currentLabels.some(({ keyLabel }) => keyLabel[testIndex] === lcChar);
                    const hasMixedCase = hasUpperCase && hasLowerCase;
                    return hasMixedCase
                        ? ({ keyLabel }) => keyLabel[testIndex] === character
                        : ({ keyLabel }) => lc(keyLabel[testIndex]) === lcChar;
                }
                else {
                    return ({ keyLabel }) => keyLabel[testIndex] === character;
                }
            };
        });
        this.fsm = StateMachine.create({
            initial: 'off',
            events: [
                { name: 'activate', from: 'off', to: 'on' },
                { name: 'key', from: 'on', to: 'on' },
                { name: 'reset', from: 'on', to: 'on' },
                { name: 'jump', from: 'on', to: 'off' },
                { name: 'exit', from: 'on', to: 'off' }
            ],
            callbacks: {
                // onactivate: (event: any, from: string, to: string) => {
                onactivate: () => {
                    this.keydownListener = (event) => {
                        // only test with `key`, not `prop` because code may be
                        // misleading on some international keyboard layours for
                        // example, 'm' key on FR azerty reports as code 'Semicolon')
                        const { key, metaKey, ctrlKey, altKey } = event;
                        if (metaKey || ctrlKey || altKey) {
                            return;
                        }
                        if (/^[A-Za-z]{1}$/.test(key)) {
                            event.preventDefault();
                            event.stopPropagation();
                            this.fsm.key(key);
                        }
                    };
                    this.setSettings();
                    this.currentKeys = '';
                    this.keyEventsElement.addEventListener('keydown', this.keydownListener, true);
                    for (const e of ['blur', 'click', 'scroll']) {
                        this.keyEventsElement.addEventListener(e, () => this.clearJumpModeHandler(), true);
                    }
                    const keys = keys_1.getKeySet(this.settings);
                    const markerManager = marker_manager_1.default();
                    const environment = {
                        settings: this.settings,
                        markers: markerManager,
                    };
                    // TODO:rixo move that responsibility in tree-view related module
                    const treeView = document.getElementsByClassName('tree-view');
                    if (treeView.length) {
                        viewHelpers_1.addJumpModeClasses(treeView[0]);
                    }
                    const labellers = [
                        words_1.default,
                        settings_1.default,
                        tree_view_1.default,
                        tabs_1.default,
                    ];
                    let allLabels = labellers
                        .map(getLabels => getLabels(environment))
                        .reduce(concatAll, []);
                    allLabels = allLabels
                        .map(keys.assignKeyLabel(allLabels.length))
                        // exclude labels with no assigned keys
                        .filter(hasKeyLabel);
                    // render
                    const isTruthy = x => !!x;
                    allLabels = allLabels
                        .map(label => label.drawLabel())
                        .filter(isTruthy);
                    this.allLabels = allLabels;
                    // apply changes all at once to DOM
                    markerManager.render();
                    // self contained cleaning function
                    this.destroyLabels = () => {
                        markerManager.destroy();
                        for (const label of this.allLabels) {
                            label.destroy();
                        }
                        // Very important for GC. Verifiable in
                        // Dev Tools -> Timeline -> Nodes.
                        this.allLabels = [];
                        this.destroyLabels = null;
                    };
                    this.currentLabels = _.clone(this.allLabels);
                },
                onkey: (event, from, to, character) => {
                    const test = createTest(character);
                    const matched = this.currentLabels.some(test);
                    if (!matched) {
                        this.setStatus(false);
                        return;
                    }
                    // ^ the above makes this func feel not single responsibility
                    // some substate ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
                    this.setStatus(character);
                    this.currentLabels = this.currentLabels.filter(label => {
                        const match = test(label);
                        const element = label.element;
                        if (element) {
                            const cls = match ? 'hot' : 'irrelevant';
                            element.classList.add(cls);
                        }
                        return match;
                    });
                    this.currentKeys += character;
                    if (this.currentLabels.length === 1 && this.currentKeys.length === 2) {
                        if (this.fsm.can('jump')) {
                            this.fsm.jump(this.currentLabels[0]);
                        }
                    }
                },
                onjump: (event, from, to, location) => {
                    const callback = this.callbacks.jump;
                    if (callback) {
                        const abort = callback(location);
                        if (abort !== false) {
                            this.resetCallbacks();
                            location.jump();
                        }
                    }
                    else {
                        location.jump();
                    }
                },
                onexit: () => {
                    const callback = this.callbacks.cancel;
                    if (callback) {
                        callback();
                    }
                },
                onreset: (event, from, to) => {
                    this.currentKeys = '';
                    this.currentLabels = _.clone(this.allLabels);
                    for (const label of this.currentLabels) {
                        if (label.element) {
                            label.element.classList.remove('irrelevant');
                            label.element.classList.remove('hot');
                        }
                    }
                },
                // STATE CHANGES:
                onoff: (event, from, to) => {
                    if (from === 'on') {
                        this.clearJumpMode();
                    }
                    if (this.statusBarJumpy) {
                        this.statusBarJumpy.style.display = 'none';
                    }
                    this.setStatus(''); // Just for correctness really
                },
                onbeforeevent: (event, from, to) => {
                    this.initializeStatusBar();
                    // Reset statuses:
                    this.setStatus('Jump Mode!');
                    this.showStatus();
                    if (this.statusBarJumpy) {
                        this.statusBarJumpy.classList.remove('no-match');
                    }
                }
            }
        });
        // TODO: do I need the () => or just =>
        this.commands.add(atom.commands.add('atom-workspace', {
            'jumpy:toggle': () => { this.toggle(); },
            'jumpy:reset': () => {
                if (this.fsm.can('reset')) {
                    this.fsm.reset();
                }
            },
            'jumpy:clear': () => {
                if (this.fsm.can('exit')) {
                    this.fsm.exit();
                }
            }
        }));
    }
    resetCallbacks() {
        this.callbacks = { jump: null, cancel: null };
    }
    // This needs to be called when status bar is ready, so can't be called from constructor
    initializeStatusBar() {
        if (this.statusBar) {
            return;
        }
        this.statusBar = document.querySelector('status-bar');
        if (this.statusBar) {
            const statusBarJumpyElement = document.createElement('div');
            statusBarJumpyElement.id = 'status-bar-jumpy';
            statusBarJumpyElement.classList.add('inline-block');
            statusBarJumpyElement.innerHTML = 'Jumpy: <span class="status"></span>';
            this.statusBar.addLeftTile({
                item: statusBarJumpyElement,
                priority: -1
            });
            this.statusBarJumpy = this.statusBar.querySelector('#status-bar-jumpy');
            if (this.statusBarJumpy) {
                this.statusBarJumpyStatus = this.statusBarJumpy.querySelector('.status');
                this.savedInheritedDisplay = this.statusBarJumpy.style.display;
            }
        }
    }
    showStatus() {
        if (this.statusBarJumpy) {
            this.statusBarJumpy.style.display = this.savedInheritedDisplay;
        }
    }
    setStatus(status) {
        if (this.statusBarJumpyStatus) {
            if (status === false) {
                if (this.statusBarJumpy) {
                    this.statusBarJumpy.classList.add('no-match');
                }
                status = 'No Match!';
            }
            this.statusBarJumpyStatus.innerHTML = status;
        }
    }
    setSettings() {
        let fontSize = atom.config.get('jumpy.fontSize');
        if (isNaN(fontSize) || fontSize > 1) {
            fontSize = .75; // default
        }
        const fontSizeString = `${fontSize * 100}%`;
        this.settings = {
            fontSize: fontSizeString,
            highContrast: atom.config.get('jumpy.highContrast'),
            wordsPattern: new RegExp(atom.config.get('jumpy.matchPattern'), 'g'),
            treeViewAutoSelect: true,
            preferAlternateHands: atom.config.get('jumpy.preferAlternateHands'),
            smartCaseMatch: atom.config.get('jumpy.smartCaseMatch'),
            customKeys: atom.config.get('jumpy.customKeys'),
            customKeysLeft: atom.config.get('jumpy.customKeysLeft'),
            customKeysRight: atom.config.get('jumpy.customKeysRight'),
            settingsTargetSelectors: [
                'a',
                'button',
                'input:not([tabIndex = "-1"])',
                'select',
                'atom-text-editor',
                '.package-card',
                '.sub-section-heading.has-items$right',
                '.repo-link',
            ],
        };
    }
    toggle(onJump, onCancel) {
        if (this.fsm.can('activate')) {
            // console.time('activate')
            this.callbacks = {
                jump: onJump,
                cancel: onCancel,
            };
            this.fsm.activate(onJump);
            // console.timeEnd('activate')
        }
        else if (this.fsm.can('exit')) {
            this.fsm.exit();
        }
    }
    clearJumpModeHandler() {
        if (this.fsm.can('exit')) {
            this.fsm.exit();
        }
    }
    // TODO: move into fsm? change callers too
    clearJumpMode() {
        const clearAllLabels = () => {
            if (this.destroyLabels) {
                this.destroyLabels();
            }
        };
        this.keyEventsElement.removeEventListener('keydown', this.keydownListener, true);
        for (const e of ['blur', 'click', 'scroll']) {
            this.keyEventsElement.removeEventListener(e, () => this.clearJumpModeHandler(), true);
        }
        const treeView = document.getElementsByClassName('tree-view');
        if (treeView.length) {
            viewHelpers_1.removeJumpModeClasses(treeView[0]);
        }
        for (const editor of atom.workspace.getTextEditors()) {
            const editorView = atom.views.getView(editor);
            viewHelpers_1.removeJumpModeClasses(editorView);
        }
        clearAllLabels();
        if (this.disposables) {
            this.disposables.dispose();
        }
    }
    // Returns an object that can be retrieved when package is activated
    serialize() { }
    // Tear down any state and detach
    destroy() {
        if (this.commands) {
            this.commands.dispose();
        }
        this.clearJumpMode();
    }
}
exports.default = JumpyView;
//# sourceMappingURL=jumpy-view.js.map
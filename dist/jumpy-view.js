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
const label_reducer_1 = require("./label-reducer");
const keys_1 = require("./keys");
const viewHelpers_1 = require("./viewHelpers");
const marker_manager_1 = require("./marker-manager");
const concatAll = (a, b) => a.concat(b);
const hasKeyLabel = label => label.keyLabel;
class JumpyView {
    constructor() {
        this.keyEventsElement = document.body;
        this.disposables = new atom_1.CompositeDisposable();
        this.drawnLabels = [];
        this.commands = new atom_1.CompositeDisposable();
        // "setup" theme
        document.body.classList.add('jumpy-theme-vimium');
        let jumpCallback;
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
                onactivate: (event, from, to, callback) => {
                    jumpCallback = callback;
                    this.keydownListener = (event) => {
                        // use the code property for testing if
                        // the key is relevant to Jumpy
                        // that is, that it's an alpha char.
                        // use the key character to pass the exact key
                        // that is, (upper or lower) to the state machine.
                        // if jumpy catches it...stop the event propagation.
                        const { code, key, metaKey, ctrlKey, altKey } = event;
                        if (metaKey || ctrlKey || altKey) {
                            return;
                        }
                        if (/^Key[A-Z]{1}$/.test(code)) {
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
                    const markerManager = marker_manager_1.default();
                    const environment = {
                        keys: keys_1.getKeySet(atom.config.get('jumpy.customKeys')),
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
                    // // TODO: I really think alllabels can just be drawnlabels
                    // // maybe I call labeler.draw() still returns back anyway?
                    // // Less functional?
                    this.allLabels = labellers
                        .map(getLabels => getLabels(environment))
                        .reduce(concatAll, [])
                        // exclude labels without assigned keys
                        .filter(hasKeyLabel);
                    // render
                    const isTruthy = x => !!x;
                    const newlyDrawnLabels = this.allLabels
                        .map(label => label.drawLabel())
                        .filter(isTruthy);
                    this.drawnLabels = [...this.drawnLabels, ...newlyDrawnLabels];
                    // apply changes all at once to DOM
                    markerManager.render();
                    // self contained cleaning function
                    this.destroyLabels = () => {
                        markerManager.destroy();
                        for (const label of this.allLabels) {
                            label.destroy();
                        }
                        this.destroyLabels = null;
                    };
                    this.currentLabels = _.clone(this.allLabels);
                },
                onkey: (event, from, to, character) => {
                    // TODO: instead... of the following, maybe do with
                    // some substate ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
                    const testKeys = this.currentKeys + character;
                    const matched = this.currentLabels.some((label) => {
                        if (!label.keyLabel) {
                            return false;
                        }
                        return label.keyLabel.startsWith(testKeys);
                    });
                    if (!matched) {
                        if (this.statusBarJumpy) {
                            this.statusBarJumpy.classList.add('no-match');
                        }
                        this.setStatus('No Match!');
                        return;
                    }
                    // ^ the above makes this func feel not single responsibility
                    // some substate ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
                    this.currentKeys = testKeys;
                    for (const label of this.drawnLabels) {
                        if (!label.keyLabel || !label.element) {
                            continue;
                        }
                        if (label.keyLabel.startsWith(this.currentKeys)) {
                            label.element.classList.add('hot');
                        }
                        else {
                            label.element.classList.add('irrelevant');
                        }
                    }
                    this.setStatus(character);
                    this.currentLabels = label_reducer_1.default(this.currentLabels, this.currentKeys);
                    if (this.currentLabels.length === 1 && this.currentKeys.length === 2) {
                        if (this.fsm.can('jump')) {
                            this.fsm.jump(this.currentLabels[0]);
                        }
                    }
                },
                onjump: (event, from, to, location) => {
                    if (jumpCallback) {
                        const abort = jumpCallback(location);
                        jumpCallback = null;
                        if (abort !== false) {
                            location.jump();
                        }
                    }
                    else {
                        location.jump();
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
    // TODO cancel
    toggle(callback, onCancel) {
        if (this.fsm.can('activate')) {
            // console.time('activate')
            this.fsm.activate(callback);
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
            this.drawnLabels = []; // Very important for GC.
            // Verifiable in Dev Tools -> Timeline -> Nodes.
            this.allLabels = [];
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
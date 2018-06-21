'use babel';

// TODO: Merge in @johngeorgewright's code for treeview
// TODO: Merge in @willdady's code for better accuracy.

/* global atom */
import { CompositeDisposable } from 'atom';
import * as _ from 'lodash';

import { LabelEnvironment, Label } from './label-interface';
import getWordLabels from './labelers/words';
import getTabLabels from './labelers/tabs';
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import * as StateMachine from 'javascript-state-machine';
import { getKeySet } from './keys';
import { addJumpModeClasses, removeJumpModeClasses } from './viewHelpers';
import createMarkerManager from './marker-manager'

const $$$ = fn => fn()
const concatAll = (a, b) => a.concat(b)
const hasKeyLabel = label => label.keyLabel

export default class JumpyView {
  keyEventsElement: HTMLElement;
  disposables: CompositeDisposable;
  commands: CompositeDisposable;
  fsm: any;
  currentKeys: string;
  allLabels: Array<Label>; // TODO: these lists of labels seem a little much.
  currentLabels: Array<Label>;
  keydownListener: any;
  settings: any;
  statusBar: any;
  statusBarJumpy: HTMLElement | null;
  statusBarJumpyStatus: HTMLElement | null;
  savedInheritedDisplay: any;
  destroyLabels: Function | null;
  callbacks: {jump: Function, cancel: Function};

  constructor() {
    this.keyEventsElement = document.body;
    this.disposables = new CompositeDisposable();
    this.commands = new CompositeDisposable();
    this.resetCallbacks()

    // With smartCaseMatch, test is case-insensitive when there is no
    // ambiguity (i.e. all next possible target chars are lowercase or
    // they all are uppercase).
    const createTest = $$$(() => {
      const lc = s => s.toLowerCase()
      const uc = s => s.toUpperCase()
      return (character: string) => {
        const testIndex = this.currentKeys.length
        if (this.settings.smartCaseMatch) {
          const lcChar = lc(character)
          const ucChar = uc(character)
          const hasUpperCase = this.currentLabels.some(
            ({keyLabel}) => keyLabel[testIndex] === ucChar
          )
          const hasLowerCase = this.currentLabels.some(
            ({keyLabel}) => keyLabel[testIndex] === lcChar
          )
          const hasMixedCase = hasUpperCase && hasLowerCase
          return hasMixedCase
          ? ({keyLabel}) => keyLabel[testIndex] === character
          : ({keyLabel}) => lc(keyLabel[testIndex]) === lcChar
        } else {
          return ({keyLabel}) => keyLabel[testIndex] === character
        }
      }
    })

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
          this.keydownListener = (event: any) => {
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
          const {settings} = this;

          this.currentKeys = '';

          this.keyEventsElement.addEventListener('keydown', this.keydownListener, true);
          for (const e of ['blur', 'click', 'scroll']) {
            this.keyEventsElement.addEventListener(e, () => this.clearJumpModeHandler(), true);
          }

          const keys = getKeySet(settings)
          const markerManager = createMarkerManager(settings)
          const environment: LabelEnvironment = {
            settings,
            markers: markerManager,
          };

          // TODO:rixo move that responsibility in tree-view related module
          const treeView: HTMLCollectionOf<HTMLElement> =
            <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName('tree-view');
          if (treeView.length) {
            addJumpModeClasses(treeView[0]);
          }

          const wordLabels = getWordLabels(environment)
          const otherLabellers = [
            getSettingsLabels,
            getTreeViewLabels,
            getTabLabels,
          ]
          const otherLabels = otherLabellers
            .map(getLabels => getLabels(environment))
            .reduce(concatAll, [])

          let allLabels = [
            ...wordLabels,
            ...otherLabels,
          ]

          allLabels = allLabels
            .map(keys.assignKeyLabel(allLabels.length, wordLabels.length))
            // exclude labels with no assigned keys
            .filter(hasKeyLabel)

          // render
          const isTruthy = x => !!x
          allLabels = allLabels
            .map(label => label.drawLabel())
            .filter(isTruthy)

          this.allLabels = allLabels

          // apply changes all at once to DOM
          markerManager.render()

          // self contained cleaning function
          this.destroyLabels = () => {
            markerManager.destroy()
            for (const label of this.allLabels) {
              label.destroy()
            }
            // Very important for GC. Verifiable in
            // Dev Tools -> Timeline -> Nodes.
            this.allLabels = []
            this.destroyLabels = null
          }

          this.currentLabels = _.clone(this.allLabels);
        },

        onkey: (event: any, from: string, to: string, character: string) => {
          const test = createTest(character)
          const matched = this.currentLabels.some(test)

          if (!matched) {
            this.setStatus(false)
            return
          }
          // ^ the above makes this func feel not single responsibility
          // some substate ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?

          this.setStatus(character);

          this.currentLabels = this.currentLabels.filter(label => {
            const match = test(label)
            const element = label.element
            if (element) {
              const cls = match ? 'hot' : 'irrelevant'
              element.classList.add(cls)
            }
            return match
          })

          this.currentKeys += character

          if (this.currentLabels.length === 1 && this.currentKeys.length === 2) {
            if (this.fsm.can('jump')) {
              this.fsm.jump(this.currentLabels[0]);
            }
          }
        },

        onbeforejump: (event: any, from: string, to: string, location: Label) => {
          const jump = () => {
            // animation must take place before element is removed from DOM,
            // which can be triggered by the jump implem (e.g. when tabs
            // changes focused pane, triggering a blur event that we're
            // listening)
            if (atom.config.get('jumpy.useHomingBeaconEffectOnJumps')) {
                location.animateBeacon();
            }
            location.jump()
            this.resetCallbacks()
          }
          const callback = this.callbacks.jump
          if (callback) {
            const abort = callback(location)
            if (abort !== false) {
              jump()
            }
          } else {
            jump()
          }
        },

        onexit: () => {
          const callback = this.callbacks.cancel
          if (callback) {
            callback()
          }
        },

        onreset: (event: any, from: string, to: string) => {
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
        onoff: (event: any, from: string, to: string) => {
          if (from === 'on') {
            this.clearJumpMode();
          }
          if (this.statusBarJumpy) {
            this.statusBarJumpy.style.display = 'none';
          }
          this.setStatus(''); // Just for correctness really
        },

        onbeforeevent: (event: any, from: string, to: string) => {
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
      'jumpy:toggle': () => { this.toggle() },
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
    this.callbacks = {jump: null, cancel: null}
  }

  // This needs to be called when status bar is ready, so can't be called from constructor
  initializeStatusBar() {
    if (this.statusBar) {
      return;
    }

    this.statusBar = <HTMLElement>document.querySelector('status-bar');
    if (this.statusBar) {
      const statusBarJumpyElement = document.createElement('div');
      statusBarJumpyElement.id = 'status-bar-jumpy';
      statusBarJumpyElement.classList.add('inline-block');
      statusBarJumpyElement.innerHTML = 'Jumpy: <span class="status"></span>';
      this.statusBar.addLeftTile({
        item: statusBarJumpyElement,
        priority: -1
      });
      this.statusBarJumpy = <HTMLElement>this.statusBar.querySelector('#status-bar-jumpy');
      if (this.statusBarJumpy) {
        this.statusBarJumpyStatus = <HTMLElement>this.statusBarJumpy.querySelector('.status');
        this.savedInheritedDisplay = this.statusBarJumpy.style.display;
      }
    }
  }

  showStatus() { // restore typical status bar display (inherited)
    if (this.statusBarJumpy) {
      this.statusBarJumpy.style.display = this.savedInheritedDisplay;
    }
  }

  setStatus(status: string | false) {
    if (this.statusBarJumpyStatus) {
      if (status === false) {
        if (this.statusBarJumpy) {
          this.statusBarJumpy.classList.add('no-match');
        }
        status = 'No Match!'
      }
      this.statusBarJumpyStatus.innerHTML = status;
    }
  }

  setSettings() {
    let fontSize: number = atom.config.get('jumpy.fontSize');
    if (isNaN(fontSize) || fontSize > 1) {
      fontSize = .75; // default
    }
    const fontSizeString: string = `${fontSize * 100}%`;
    this.settings = {
      theme: atom.config.get('jumpy.theme'),
      fontSize: fontSizeString,
      wordsPattern: new RegExp(atom.config.get('jumpy.matchPattern'), 'g'),
      treeViewAutoSelect: true,
      preferAlternateHands: atom.config.get('jumpy.preferAlternateHands'),
      smartCaseMatch: atom.config.get('jumpy.smartCaseMatch'),
      customKeys: atom.config.get('jumpy.customKeys'),
      customKeysLeft: atom.config.get('jumpy.customKeysLeft'),
      customKeysRight: atom.config.get('jumpy.customKeysRight'),
      allUppercase: atom.config.get('jumpy.allUppercase'),
      hideMatchedChars: atom.config.get('jumpy.hideMatchedChars'),
      useEditorFontFamily: atom.config.get('jumpy.useEditorFontFamily'),
      // TODO config (but the best config should probably be a list of
      //      possible built-in regex to choose from)
      useBuiltInRegexMatchAllTheThings: true,
      settingsTargetSelectors: [ // TODO config
        'a',
        'button:not([tabIndex="-1"])',
        'input:not([tabIndex="-1"])',
        'select',
        'atom-text-editor',
        // we can't use .package-card selector directly because it
        // matches the (unclickable) card in top of package detail
        '.sub-section .package-card', // "Packages" section
        '.section.packages .package-card', // "Installed" section
        '.sub-section-heading.has-items$right',
        '.repo-link',
      ],
    };
  }

  toggle(onJump?: Function, onCancel?: Function) {
    if (this.fsm.can('activate')) {
      // console.time('activate')
      this.callbacks = {
        jump: onJump,
        cancel: onCancel,
      }
      this.fsm.activate(onJump);
      // console.timeEnd('activate')
    } else if (this.fsm.can('exit')) {
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
        this.destroyLabels()
      }
    };

    this.keyEventsElement.removeEventListener('keydown', this.keydownListener, true);
    for (const e of ['blur', 'click', 'scroll']) {
      this.keyEventsElement.removeEventListener(e, () => this.clearJumpModeHandler(), true);
    }
    const treeView: HTMLCollectionOf<HTMLElement> =
      <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName('tree-view');
    if (treeView.length) {
      removeJumpModeClasses(treeView[0]);
    }
    for (const editor of atom.workspace.getTextEditors()) {
      const editorView = atom.views.getView(editor);
      removeJumpModeClasses(editorView);
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

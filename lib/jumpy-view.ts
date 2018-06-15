'use babel';

// TODO: Merge in @johngeorgewright's code for treeview
// TODO: Merge in @willdady's code for better accuracy.

/* global atom */
import { CompositeDisposable, TextEditor } from 'atom';
import * as _ from 'lodash';

import { LabelEnvironment, Label } from './label-interface';
import getWordLabels from './labelers/words';
import getTabLabels from './labelers/tabs';
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import * as StateMachine from 'javascript-state-machine';
import labelReducer from './label-reducer';
import { getKeySet } from './keys';
import { addJumpModeClasses, removeJumpModeClasses } from './viewHelpers';

const assert = value => {
  if (!value) throw new Error('Failed assertion')
}

interface MarkerLayer {
  layer: HTMLElement
  container: HTMLElement
}

type addMarker = (
  editor: TextEditor,
  element: HTMLElement,
  lineNumber: number,
  column: number,
) => void

interface MarkerManager {
  getLayers: () => Array<MarkerLayer>
  addMarker: addMarker
}

const createMarkerManager = (): MarkerManager => {
  const cache = {}
  const layers = {}
  const getLineTop = (editor: TextEditor, lineNumber: number) => {
    const id = editor.id
    if (!cache[id]) {
      cache[id] = {}
    }
    if (cache[id][lineNumber] === undefined) {
      const editorEl = atom.views.getView(editor)
      const lineEl = editorEl.querySelector(
        `.line[data-screen-row="${lineNumber}"]`
      )
      cache[id][lineNumber] = lineEl
        ? lineEl.getBoundingClientRect().top
        : null
    }
    return cache[id][lineNumber]
  }
  // TODO:rixo refactor addEditorMarker to use addMarker
  const addMarker = (
    editor: TextEditor | null,
    element: HTMLElement,
    lineNumber: number | {top?, left?, bottom?, right?},
    column?: number,
  ): void => {
    if (editor) {
      addEditorMarker(editor, element, <number> lineNumber, column)
    } else if (typeof lineNumber === 'object') {
      appendMarker(element, lineNumber)
    } else {
      appendMarker(element, column, lineNumber)
    }
  }

  const _ABSOLUTE_LAYER_ = Symbol('_ABSOLUTE_LAYER_')
  const appendMarker = (element, x, y?) => {
    const id = _ABSOLUTE_LAYER_
    if (!layers[id]) {
      const layer = document.createElement('div')
      layer.classList.add('jumpy-layer')
      layer.classList.add('jumpy-layer-absolute')
      const container = document.body
      layers[id] = {layer, container}
    }
    const {layer} = layers[id]
    if (typeof x === 'object') {
      Object.assign(element.style, x)
      // Object.entries(x).forEach(([prop, value]) => {
      //   element.style[prop]
      // })
    } else {
      element.style.left = `${x}px`
      element.style.top = `${y}px`
    }
    layer.appendChild(element)
  }

  const addEditorMarker = (
    editor: TextEditor,
    element: HTMLElement,
    lineNumber: number,
    column: number,
  ) => {
    const id = editor.id
    const top = getLineTop(editor, lineNumber)
    if (top === null) {
      return
    }
    if (!layers[id]) {
      const layer = document.createElement('div')
      layer.classList.add('jumpy-layer')
      const editorEl = atom.views.getView(editor)
      const lines = editorEl.querySelector('.lines')
      assert(lines.parentElement.style.transform)
      const offsetTop = lines.parentElement.getBoundingClientRect().top
      const charWidth = editorEl.getBaseCharacterWidth()
      layers[id] = { layer, container: lines, offsetTop, charWidth }
    }
    const { layer, offsetTop, charWidth } = layers[id]
    element.style.top = `${top - offsetTop}px`
    element.style.left = `${charWidth * column}px`
    layer.appendChild(element)
  }

  const getLayers = (): Array<MarkerLayer> =>
    [...Object.values(layers), layers[_ABSOLUTE_LAYER_]]

  return {
    getLayers,
    addMarker,
  }
}

export default class JumpyView {
  workspaceElement: any;
  disposables: CompositeDisposable;
  commands: CompositeDisposable;
  fsm: any;
  currentKeys: string;
  allLabels: Array<Label>; // TODO: these lists of labels seem a little much.
  currentLabels: Array<Label>;
  drawnLabels: Array<Label>;
  keydownListener: any;
  settings: any;
  statusBar: any;
  statusBarJumpy: HTMLElement | null;
  statusBarJumpyStatus: HTMLElement | null;
  savedInheritedDisplay: any;
  destroyLabels: Function | null;

  constructor(serializedState: any) {
    this.workspaceElement = atom.views.getView(atom.workspace);
    this.disposables = new CompositeDisposable();
    this.drawnLabels = [];
    this.commands = new CompositeDisposable();

    // "setup" theme
    document.body.classList.add('jumpy-theme-vimium')

    let jumpCallback

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
          jumpCallback = callback

          this.keydownListener = (event: any) => {
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

          this.workspaceElement.addEventListener('keydown', this.keydownListener, true);
          for (const e of ['blur', 'click', 'scroll']) {
            this.workspaceElement.addEventListener(e, () => this.clearJumpModeHandler(), true);
          }

          const environment: LabelEnvironment = {
            keys: getKeySet(atom.config.get('jumpy.customKeys')),
            settings: this.settings,
          };

          // TODO:rixo move that responsibility in tree-view related module
          const treeView: HTMLCollectionOf<HTMLElement> =
            <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName('tree-view');
          if (treeView.length) {
            addJumpModeClasses(treeView[0]);
          }

          // TODO: reduce with concat all labelers -> labeler.getLabels()
          const wordLabels: Array<Label> = getWordLabels(environment);
          const tabLabels: Array<Label> = getTabLabels(environment);
          const settingsLabels: Array<Label> = getSettingsLabels(environment);
          const treeViewLabels: Array<Label> = getTreeViewLabels(environment);

          // TODO: I really think alllabels can just be drawnlabels
          // maybe I call labeler.draw() still returns back anyway?
          // Less functional?
          this.allLabels = [
            ...wordLabels,
            ...settingsLabels,
            ...treeViewLabels,
            ...tabLabels,
          ]

          // render
          const {addMarker, getLayers} = createMarkerManager()
          const isTruthy = x => !!x
          const drawLabel = addMarker => label => label.drawLabel(addMarker)
          const newlyDrawnLabels = this.allLabels
            .map(drawLabel(addMarker))
            .filter(isTruthy)
          // // render tab labels
          // for (const label of tabLabels) {
          //   this.drawnLabels.push(label)
          //   label.drawLabel()
          // }
          // // render word labels
          // for (const label of wordLabels) {
          //   this.drawnLabels.push(label)
          //   label.drawLabel(addMarker)
          // }
          this.drawnLabels = [...this.drawnLabels, ...newlyDrawnLabels]

          // apply changes all at once to DOM
          for (const {layer, container} of getLayers()) {
            container.appendChild(layer)
          }

          // self contained cleaning function
          this.destroyLabels = () => {
          for (const {layer} of getLayers()) {
              layer.remove()
            }
            for (const label of tabLabels) {
              label.destroy()
            }
            this.destroyLabels = null
          }

          this.currentLabels = _.clone(this.allLabels);
        },

        onkey: (event: any, from: string, to: string, character: string) => {
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
              label.element.classList.add('hot')
            } else {
              label.element.classList.add('irrelevant');
            }
          }

          this.setStatus(character);

          this.currentLabels = labelReducer(this.currentLabels, this.currentKeys);

          if (this.currentLabels.length === 1 && this.currentKeys.length === 2) {
            if (this.fsm.can('jump')) {
              this.fsm.jump(this.currentLabels[0]);
            }
          }
        },

        onjump: (event: any, from: string, to: string, location: Label) => {
          if (jumpCallback) {
            const abort = jumpCallback(location)
            jumpCallback = null
            if (abort !== false) {
              location.jump()
            }
          } else {
            location.jump()
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

  setStatus(status: string) {
    if (this.statusBarJumpyStatus) {
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
      fontSize: fontSizeString,
      highContrast: <boolean>atom.config.get('jumpy.highContrast'),
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
      ],
    };
  }

  // TODO cancel
  toggle(callback?: Function, onCancel?: Function) {
    if (this.fsm.can('activate')) {
      // console.time('activate')
      this.fsm.activate(callback);
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
      this.drawnLabels = []; // Very important for GC.
      // Verifiable in Dev Tools -> Timeline -> Nodes.
    };

    this.allLabels = [];
    this.workspaceElement.removeEventListener('keydown', this.keydownListener, true);
    for (const e of ['blur', 'click', 'scroll']) {
      this.workspaceElement.removeEventListener(e, () => this.clearJumpModeHandler(), true);
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

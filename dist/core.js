'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const state_machine_1 = require("./state-machine");
const keys_1 = require("./keys");
const label_manager_1 = require("./label-manager");
const words_1 = require("./labelers/words");
const tabs_1 = require("./labelers/tabs");
const settings_1 = require("./labelers/settings");
const tree_view_1 = require("./labelers/tree-view");
const config_1 = require("./config");
const configKeyPath = 'jumpy';
const Adapter = ({ config, onBlur, onKey }) => {
    const keyboard = KeyboardManager({ onBlur, onKey });
    const labels = Labels(config);
    return {
        grabKeyboard: keyboard.grab,
        releaseKeyboard: keyboard.release,
        createLabels: labels.createLabels,
        destroyLabels: labels.destroyLabels,
        updateLabels: labels.updateLabels,
        // jump: (data, {label}) => console.log('jump', event.label),
        jump: (data, { label }) => {
            label.jump();
        },
        statusIdle: () => console.log('statusIdle'),
        statusMatch: () => console.log('statusMatch'),
        statusNoMatch: () => console.log('statusNoMatch'),
    };
};
const Labels = (config) => {
    const hasKeyLabel = label => label.keyLabel;
    const concatAll = (a, b) => a.concat(b);
    let labelManager = null;
    const createLabels = (data) => {
        labelManager = label_manager_1.default(config);
        const environment = {
            settings: config,
            labels: labelManager,
        };
        const wordLabels = words_1.default(environment);
        const otherLabellers = [
            settings_1.default,
            tree_view_1.default,
            tabs_1.default,
        ];
        const otherLabels = otherLabellers
            .map(getLabels => getLabels(environment))
            .reduce(concatAll, []);
        let allLabels = [...wordLabels, ...otherLabels];
        // assign keys
        const keys = keys_1.getKeySet(config);
        allLabels = allLabels
            .map(keys.assignKeyLabel(allLabels.length, wordLabels.length))
            // exclude labels with no assigned keys
            .filter(hasKeyLabel);
        // render
        const isTruthy = x => !!x;
        allLabels = allLabels
            .map(label => label.drawLabel())
            .filter(isTruthy);
        labelManager.render();
        return Object.assign({}, data, { labels: allLabels, visibleLabels: allLabels, hiddenLabels: [] });
    };
    const destroyLabels = (data) => {
        if (labelManager) {
            labelManager.destroy();
            labelManager = null;
        }
        // TODO remove: unneeded
        for (const label of data.labels) {
            label.destroy();
        }
        const empty = [];
        return Object.assign({}, data, { labels: empty, visibleLabels: empty, hiddenLabels: empty });
    };
    const updateLabels = data => {
        const { visibleLabels, hiddenLabels } = data;
        visibleLabels.forEach(({ element }) => {
            if (element) {
                element.classList.add('hot');
                element.classList.remove('irrelevant');
            }
        });
        hiddenLabels.forEach(({ element }) => {
            if (element) {
                element.classList.remove('hot');
                element.classList.add('irrelevant');
            }
        });
    };
    return {
        createLabels,
        destroyLabels,
        updateLabels,
    };
};
const KeyboardManager = ({ onBlur, onKey }) => {
    const keyEventsElement = document.body;
    const grab = () => {
        keyEventsElement.addEventListener('keydown', onKeydown, true);
        if (onBlur) {
            for (const e of ['blur', 'click', 'scroll']) {
                keyEventsElement.addEventListener(e, onBlur, true);
            }
        }
    };
    const release = () => {
        keyEventsElement.removeEventListener('keydown', onKeydown, true);
        if (onBlur) {
            for (const e of ['blur', 'click', 'scroll']) {
                keyEventsElement.removeEventListener(e, onBlur, true);
            }
        }
    };
    const onKeydown = (event) => {
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
            onKey(key);
        }
    };
    return { grab, release };
};
exports.default = () => {
    let disposable;
    let adapter;
    let fsm;
    return {
        activate,
        deactivate,
    };
    function activate() {
        disposable = new atom_1.CompositeDisposable();
        disposable.add(addCommands());
        disposable.add(observeConfig());
        init(atom.config.get(configKeyPath));
    }
    function deactivate() {
        disposable.dispose();
        disposable = null;
        adapter = null;
        fsm = null;
    }
    function init(config) {
        config = config_1.parseConfig(config);
        const bridge = {
            onBlur: () => fsm.cancel(),
            onKey: key => fsm.key(key),
        };
        adapter = Adapter(Object.assign({ config }, bridge));
        fsm = state_machine_1.createStateMachine({ config, adapter });
    }
    function addCommands() {
        return atom.commands.add('atom-workspace', {
            [`${configKeyPath}:toggle`]: () => fsm.activate(),
            [`${configKeyPath}:reset`]: () => fsm.reset(),
            [`${configKeyPath}:clear`]: () => fsm.cancel(),
        });
    }
    function observeConfig() {
        let lastHash = JSON.stringify(atom.config.get(configKeyPath));
        return atom.config.observe(configKeyPath, config => {
            const hash = JSON.stringify(config);
            if (hash === lastHash) {
                return;
            }
            else {
                lastHash = hash;
            }
            init(config);
        });
    }
};
//# sourceMappingURL=core.js.map
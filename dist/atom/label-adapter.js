'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keys_1 = require("../keys");
const label_manager_1 = require("./label-manager");
const words_1 = require("../labelers/words");
const tabs_1 = require("../labelers/tabs");
const settings_1 = require("../labelers/settings");
const tree_view_1 = require("../labelers/tree-view");
exports.default = (config) => {
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
    const updateLabels = (data) => {
        const { labels, visibleLabels, hiddenLabels, keys } = data;
        if (keys.length === 0) {
            labels.forEach(({ element }) => {
                if (element) {
                    element.classList.remove('hot');
                    element.classList.remove('irrelevant');
                }
            });
        }
        else {
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
        }
    };
    const flashNoMatch = () => {
        if (!labelManager) {
            return;
        }
        const { element } = labelManager;
        const flash = document.createElement('div');
        flash.classList.add('jumpy-no-match-flash');
        element.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    };
    return {
        createLabels,
        destroyLabels,
        updateLabels,
        jump: (data, { label }) => {
            const { config: { useHomingBeaconEffectOnJumps } } = data;
            if (useHomingBeaconEffectOnJumps) {
                label.animateBeacon();
            }
            label.jump();
        },
        flashNoMatch,
    };
};
//# sourceMappingURL=label-adapter.js.map
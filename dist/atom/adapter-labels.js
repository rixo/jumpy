'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keyset_1 = require("../keyset");
const label_manager_1 = require("./adapter-labels/label-manager");
const editor_coords_1 = require("./adapter-labels/editor-coords");
const labelers_1 = require("./labelers");
exports.default = (config) => {
    const hasKeyLabel = label => label.keyLabel;
    let labelManager = null;
    const createLabels = (data) => {
        const getCoordsInEditor = editor_coords_1.createTextEditorLocators();
        labelManager = label_manager_1.createLabelManager(config);
        const environment = {
            settings: config,
            labels: labelManager,
            getCoordsInEditor,
        };
        const { wordLabels, allLabels } = labelers_1.getLabels(environment);
        let visibleLabels = allLabels;
        // assign keys
        const keyset = keyset_1.getKeySet(config);
        visibleLabels = visibleLabels
            .map(keyset.assignKeyLabel(visibleLabels.length, wordLabels.length))
            // exclude labels with no assigned keyset
            .filter(hasKeyLabel);
        // render
        const isRendered = ({ element }) => !!element;
        const renderLabel = label => { label.drawLabel(); };
        visibleLabels
            .forEach(renderLabel);
        visibleLabels = visibleLabels
            .filter(isRendered);
        visibleLabels
            .forEach(labelManager.addLabel);
        labelManager.layer.render();
        return Object.assign({}, data, { labels: visibleLabels, visibleLabels, hiddenLabels: [] });
    };
    const destroyLabels = (data) => {
        if (labelManager) {
            labelManager.layer.destroy();
            labelManager = null;
        }
        // special destroy
        for (const label of data.labels) {
            if (label.destroy) {
                label.destroy();
            }
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
        const { element } = labelManager.layer;
        const flash = document.createElement('div');
        flash.classList.add('jumpy-no-match-flash');
        element.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    };
    return {
        createLabels,
        destroyLabels,
        updateLabels,
        jump: ({}, { label }) => {
            label.jump();
        },
        animateBeacon: ({}, { label }) => {
            if (labelManager) {
                labelManager.animateBeacon(label);
            }
        },
        flashNoMatch,
    };
};
//# sourceMappingURL=adapter-labels.js.map
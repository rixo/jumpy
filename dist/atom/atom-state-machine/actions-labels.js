'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const keyset_1 = require("../../util/keyset");
const label_manager_1 = require("../labels/label-manager");
const editor_coords_1 = require("../labels/editor-coords");
const labelers_1 = require("../labelers");
exports.default = () => {
    let labelManager = null;
    const createLabels = (data) => {
        const config = data.config;
        const getCoordsInEditor = editor_coords_1.createTextEditorLocators();
        labelManager = label_manager_1.createLabelManager(config);
        const environment = {
            settings: config,
            labels: labelManager,
            getCoordsInEditor,
        };
        const { wordLabels, allLabels } = labelers_1.getLabels(environment);
        const visibleLabels = allLabels
            // assign keys
            .map(assignKeyLabel(config, allLabels, wordLabels))
            .filter(hasKeyLabel)
            // render
            .map(renderLabel)
            .filter(isRendered);
        visibleLabels.forEach(labelManager.addLabel);
        labelManager.layer.render();
        return Object.assign({}, data, { 
            // only keep initially visible labels (non visible ones either
            // miss keyLabel or element)
            labels: visibleLabels, visibleLabels, hiddenLabels: [] });
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
        jump: ({}, _a) => {
            var { label } = _a, event = tslib_1.__rest(_a, ["label"]);
            label.jump(event);
        },
        animateBeacon: ({}, { label }) => {
            if (labelManager) {
                labelManager.animateBeacon(label);
            }
        },
        flashNoMatch,
    };
};
const hasKeyLabel = label => label.keyLabel;
const assignKeyLabel = (config, allLabels, primaryLabels) => {
    const keyset = keyset_1.getKeySet(config);
    const primaryCount = primaryLabels.length;
    const allCount = allLabels.length;
    return keyset.assignKeyLabel(allCount, primaryCount);
};
const isRendered = ({ element }) => !!element;
const renderLabel = label => {
    label.drawLabel();
    return label;
};
//# sourceMappingURL=actions-labels.js.map
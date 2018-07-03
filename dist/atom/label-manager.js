'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const label_layer_1 = require("./label-manager/label-layer");
const create_label_1 = require("./label-manager/create-label");
const animate_beacon_1 = require("./label-manager/animate-beacon");
exports.createLabelManager = (settings) => {
    const layer = label_layer_1.createLabelLayer(settings);
    return {
        get layer() { return layer; },
        createLabel: create_label_1.default,
        animateBeacon: animate_beacon_1.default,
        addLabel: layer.addLabel,
    };
};
//# sourceMappingURL=label-manager.js.map
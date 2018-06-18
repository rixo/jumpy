'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// (PURE FUNCTION)
//
// WHEN GIVEN:
//
//      1.  AN ARRAY OF LABELS (* SEE BELOW)
//      (and)
//      2. A NEW INPUT KEY
//
// RETURNS new collection of labels
// *without* the labels that do not start with the current key
exports.default = (labels, currentKey) => labels.filter(({ keyLabel }) => keyLabel && keyLabel.startsWith(currentKey));
//# sourceMappingURL=label-reducer.js.map
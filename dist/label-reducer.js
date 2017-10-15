"use strict";
'use babel';
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
// A *LABEL* looks like:
// { editor, lineNumber, column, keyLabel }
function labelReducer(labels, currentKey) {
    return labels.filter(function (label) {
        return label.keyLabel.startsWith(currentKey);
    });
}
module.exports = labelReducer;
//# sourceMappingURL=label-reducer.js.map
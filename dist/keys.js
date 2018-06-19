'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
exports.getKeySet = settings => settings.preferAlternateHands
    ? AlternateKeySet(settings)
    : getKeySetLegacy(settings);
const concatAll = (a, b) => a.concat(b);
const combineLeft = ([left, right]) => left.map(leftKey => right.map(rightKey => leftKey + rightKey) // ['',...]
); // [['', ...], ...]
const KeySet = (combos) => {
    const assignKeyLabel = () => o => {
        o.keyLabel = combos.shift();
        return o;
    };
    return {
        assignKeyLabel,
    };
};
const $$$ = fn => fn();
const AlternateKeySet = $$$(() => {
    const sum = (a, b) => a + b;
    const multiplyLengths = ([left, right]) => left.length * right.length;
    const calcPairsLength = pairs => pairs
        .map(multiplyLengths)
        .reduce(sum, 0);
    const upper = (keys) => keys.map(key => key.toUpperCase());
    const hashSettings = ({ customKeysLeft, customKeysRight }) => `${String(customKeysLeft)} | ${String(customKeysRight)}`;
    let priorizedPairs;
    let pairsLength;
    let allPairs;
    let lastSettingsHash = null;
    const refreshPairs = settings => {
        const currentHash = hashSettings(settings);
        if (currentHash === lastSettingsHash) {
            return;
        }
        else {
            lastSettingsHash = currentHash;
        }
        const { customKeysLeft, customKeysRight } = settings;
        const leftLC = customKeysLeft;
        const rightLC = customKeysRight;
        const leftUC = upper(leftLC);
        const rightUC = upper(rightLC);
        priorizedPairs = [
            [
                [rightLC, leftLC],
            ],
            [
                [leftLC, rightLC],
                [rightLC, leftLC],
            ],
            // leftLC+leftLC is before best combos leftLC+rightLC & rightLC+leftLC
            // because we suppose (hope) that interesting content will be roughly
            // in the middle of the editor, and (2) that leftLC+left
            [
                [leftLC, leftLC],
                [leftLC, rightLC],
                [rightLC, leftLC],
                [rightLC, rightLC],
            ],
            [
                [leftLC, leftLC],
                [leftLC, rightLC],
                [rightLC, leftLC],
                [rightLC, rightLC],
                [leftLC, rightUC],
                [rightLC, leftUC],
                [leftUC, rightLC],
                [rightUC, leftLC],
                [leftUC, rightUC],
                [rightUC, leftUC],
                [leftUC, leftUC],
                [rightUC, rightUC],
            ],
        ];
        pairsLength = priorizedPairs.map(calcPairsLength);
        allPairs = priorizedPairs[priorizedPairs.length - 1];
    };
    const pickPairs = n => {
        const bestIndex = pairsLength.findIndex(l => n <= l);
        return priorizedPairs[bestIndex] || allPairs;
    };
    const generateCombos = (pairs) => {
        const combos = pairs
            .map(combineLeft) // [[['',...],...],...]
            .reduce(concatAll, []) // [['',...],...]
            .reduce(concatAll, []); // ['', ...]
        return combos;
    };
    return (settings) => {
        const assignKeyLabel = (n) => {
            refreshPairs(settings);
            const pairs = pickPairs(n);
            const combos = generateCombos(pairs);
            return o => {
                o.keyLabel = combos.shift();
                return o;
            };
        };
        return {
            assignKeyLabel,
        };
    };
});
function getKeySetLegacy(settings) {
    const customKeys = settings.customKeys;
    let lowerCharacters = [];
    let upperCharacters = [];
    if (!customKeys.length) {
        lowerCharacters = _.range('a'.charCodeAt(0), 'z'.charCodeAt(0) + 1 /* for inclusive*/)
            .map(c => String.fromCharCode(c));
        upperCharacters = _.range('A'.charCodeAt(0), 'Z'.charCodeAt(0) + 1 /* for inclusive*/)
            .map(c => String.fromCharCode(c));
    }
    else {
        for (let key of customKeys) {
            lowerCharacters.push(key.toLowerCase());
            upperCharacters.push(key.toUpperCase());
        }
    }
    const keys = [];
    // A little ugly.
    // I used itertools.permutation in python.
    // Couldn't find a good one in npm.  Don't worry this takes < 1ms once.
    // TODO: try a zip? and or make a func
    for (let c1 of lowerCharacters) {
        for (let c2 of lowerCharacters) {
            keys.push(c1 + c2);
        }
    }
    for (let c1 of upperCharacters) {
        for (let c2 of lowerCharacters) {
            keys.push(c1 + c2);
        }
    }
    for (let c1 of lowerCharacters) {
        for (let c2 of upperCharacters) {
            keys.push(c1 + c2);
        }
    }
    // TODO: use TS's ReadonlyArray?
    return KeySet(keys);
}
//# sourceMappingURL=keys.js.map
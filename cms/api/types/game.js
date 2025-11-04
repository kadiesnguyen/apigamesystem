"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepMerge = deepMerge;
function deepMerge(base, patch) {
    var _a, _b;
    if (Array.isArray(base) || Array.isArray(patch))
        return (_a = patch) !== null && _a !== void 0 ? _a : base;
    if (typeof base === 'object' && base && typeof patch === 'object' && patch) {
        var out = __assign({}, base);
        for (var _i = 0, _c = Object.keys(patch); _i < _c.length; _i++) {
            var k = _c[_i];
            var v = patch[k];
            out[k] = k in out ? deepMerge(out[k], v) : v;
        }
        return out;
    }
    return (_b = patch) !== null && _b !== void 0 ? _b : base;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = isEmpty;
exports.getInterfacePaths = getInterfacePaths;
exports.getInterfacePathsWithTypes = getInterfacePathsWithTypes;
exports.extractValueFromObject = extractValueFromObject;
exports.assignToCustomPath = assignToCustomPath;
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
function getInterfacePaths(obj) {
    const paths = [];
    function traverse(currentObj, currentPath = "") {
        for (const key in currentObj) {
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                traverse(currentObj[key], `${currentPath}${key}.`);
            }
            else {
                paths.push(`${currentPath}${key}`);
            }
        }
    }
    traverse(obj);
    return paths;
}
function getInterfacePathsWithTypes(obj) {
    const result = [];
    function traverse(currentObj, currentPath = "") {
        for (const key in currentObj) {
            const fullPath = currentPath ? `${currentPath}.${key}` : key;
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                traverse(currentObj[key], fullPath);
            }
            else {
                result.push({ path: fullPath, type: (typeof currentObj[key]).toLowerCase() });
            }
        }
    }
    traverse(obj);
    return result;
}
function extractValueFromObject(data, field) {
    if (field === '') {
        return data;
    }
    if (typeof data === 'object') {
        if (field in data) {
            return data[field];
        }
        else {
            for (const value of Object.values(data)) {
                const result = extractValueFromObject(value, field);
                if (result !== null) {
                    return result;
                }
            }
        }
    }
    else if (Array.isArray(data)) {
        for (const item of data) {
            const result = extractValueFromObject(item, field);
            if (result !== null) {
                return result;
            }
        }
    }
    return null;
}
function assignToCustomPath(obj, propPath, value) {
    let paths = propPath.split(".");
    if (propPath === '') {
        obj = value;
        return obj;
    }
    if (paths.length > 1) {
        let key = (paths.shift());
        assignToCustomPath(obj[key] =
            Object.prototype.toString.call(obj[key]) === "[object Object]"
                ? obj[key]
                : {}, paths.join('.'), value);
    }
    else {
        if (obj[paths[0]] === undefined || obj[paths[0]] === null) {
            obj[paths[0]] = value;
        }
        else {
            Object.assign(obj[paths[0]], value);
        }
    }
    return obj;
}

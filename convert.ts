// To parse this data:
//
//   import { Convert, Quillnote } from "./file";
//
//   const quillnote = Convert.toQuillnote(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Quillnote {
    version:    number;
    notes:      Note[];
    notebooks:  Notebook[];
    idMappings: IDMapping[];
}

export interface IDMapping {
    mappingId:        number;
    localNoteId:      number;
    remoteNoteId:     number;
    provider:         string;
    extras:           string;
    isDeletedLocally: boolean;
    isBeingUpdated:   boolean;
}

export interface Notebook {
    name: string;
    id:   number;
}

export interface Note {
    title?:        string;
    content?:     string;
    isPinned?:    boolean;
    isHidden?:    boolean;
    isDeleted?:   boolean;
    isLocalOnly?: boolean;
    deletionDate: number;
    creationDate: number;
    modifiedDate: number;
    id:           number;
    isList?:      boolean;
    taskList?:    TaskList[];
    notebookId?:  number;
}

export interface TaskList {
    id:      number;
    content: string;
    isDone:  boolean;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toQuillnote(json: string): Quillnote {
        return cast(JSON.parse(json), r("Quillnote"));
    }

    public static quillnoteToJson(value: Quillnote): string {
        return JSON.stringify(uncast(value, r("Quillnote")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;

    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }

    if (typ === false) {
        console.log('typ===false', typ, val, key)
        return invalidValue(typ, val);
    }

    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Quillnote": o([
        { json: "version", js: "version", typ: 0 },
        { json: "notes", js: "notes", typ: a(r("Note")) },
        { json: "notebooks", js: "notebooks", typ: a(r("Notebook")) },
        { json: "idMappings", js: "idMappings", typ: a(r("IDMapping")) },
    ], false),
    "IDMapping": o([
        { json: "mappingId", js: "mappingId", typ: 0 },
        { json: "localNoteId", js: "localNoteId", typ: 0 },
        { json: "remoteNoteId", js: "remoteNoteId", typ: 0 },
        { json: "provider", js: "provider", typ: "" },
        { json: "extras", js: "extras", typ: "" },
        { json: "isDeletedLocally", js: "isDeletedLocally", typ: true },
        { json: "isBeingUpdated", js: "isBeingUpdated", typ: u(undefined, true) },
    ], false),
    "Notebook": o([
        { json: "name", js: "name", typ: "" },
        { json: "id", js: "id", typ: 0 },
    ], false),
    "Note": o([
        { json: "title", js: "title", typ: u(undefined, "") },
        { json: "content", js: "content", typ: u(undefined, "") },
        { json: "isPinned", js: "isPinned", typ: u(undefined, true) },
        { json: "isDeleted", js: "isDeleted", typ: u(undefined, true) },
        { json: "isHidden", js: "isHidden", typ: u(undefined, true) },
        { json: "isLocalOnly", js: "isLocalOnly", typ: u(undefined, true) },
        { json: "creationDate", js: "creationDate", typ: 0 },
        { json: "deletionDate", js: "deletionDate", typ: u(undefined, 0) },
        { json: "modifiedDate", js: "modifiedDate", typ: 0 },
        { json: "id", js: "id", typ: 0 },
        { json: "isList", js: "isList", typ: u(undefined, true) },
        { json: "taskList", js: "taskList", typ: u(undefined, a(r("TaskList"))) },
        { json: "notebookId", js: "notebookId", typ: u(undefined, 0) },
    ], false),
    "TaskList": o([
        { json: "id", js: "id", typ: 0 },
        { json: "content", js: "content", typ: "" },
        { json: "isDone", js: "isDone", typ: true },
    ], false),
};

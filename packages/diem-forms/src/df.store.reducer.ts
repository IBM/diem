/* eslint-disable complexity */
/* eslint-disable no-case-declarations */
/* eslint-disable sonarjs/cognitive-complexity */
/**
 * @module StoreReducer
 */

import { Action } from '@ngrx/store';
import cloneDeep from 'lodash-es/cloneDeep';
import { IStore, IStoreFormState, IStoreResults, IStoreTableState } from './definitions/interfaces';

const ADD_DATA: string = 'ADD_DATA';
const ADD_FORM_DATA: string = 'ADD_FORM_DATA';
const ADD_STORE: string = 'ADD_STORE';
const RESET_STORE: string = 'RESET_STORE';
const RESET_FORM_STORE: string = 'RESET_FORM_STORE';
const ADD_STORE_ITEM_RCD: string = 'ADD_STORE_ITEM_RCD';
const ADD_STORE_RCD: string = 'ADD_STORE_RCD';
const ADD_STORE_FIELD_RCD: string = 'ADD_STORE_FIELD_RCD';
const UPD_STORE_FIELD_RCD: string = 'UPD_STORE_FIELD_RCD';
const ADD_STORE_TABLE_RCD: string = 'ADD_STORE_TABLE_RCD';
const APPEND_STORE_TABLE_RCD: string = 'APPEND_STORE_TABLE_RCD';
const REM_STORE_TABLE_RCD: string = 'REM_STORE_TABLE_RCD';
const UPD_STORE_TABLE_RCD: string = 'UPD_STORE_TABLE_RCD';
const REM_STORE_FIELD_RCD: string = 'REM_STORE_FIELD_RCD';
const REM_STORE: string = 'REM_STORE';
const REM_STORE_ITEM_RCD: string = 'REM_STORE_ITEM_RCD';
const REM_STORE_RCD: string = 'REM_STORE_RCD';
const UPD_STORE: string = 'UPD_STORE';
const UPD_STORE_RECORDS: string = 'UPD_STORE_RECORDS';
const UPD_STORE_VALUES: string = 'UPD_STORE_VALUES';
const UPD_STORE_ITEM_RCD: string = 'UPD_STORE_ITEM_RCD';
const UPD_STORE_RCD: string = 'UPD_STORE_RCD';
const UPD_STORE_FORM_RCD: string = 'UPD_STORE_FORM_RCD';

const initialState: IStoreResults = {
    empty: undefined,
    error: false,
    loaded: false,
    query: { rows: 50, first: 0 },
    records: [],
    store: '',
    totalRecords: 0,
};

interface IDefaultState {
    states: any;
    error: boolean;
}

const initState: IDefaultState = {
    error: false,
    states: {},
};

/* tslint:disable:only-arrow-functions */
/* tslint:disable cognitive-complexity*/
/* tslint:disable no-big-function*/

const getNbr: (records: any) => number = (records: any): number => {
    if (records.length === 0) {
        return 0;
    } else if (records[0] && records[0].nbr) {
        return records[0].nbr;
    } else {
        return records.length;
    }
};

const reduce: (
    reducers: IStoreResults['IStoreFormTable']['reducers'],
    t3: IStoreResults,
    field: string
) => IStoreResults = (
    reducers: IStoreResults['IStoreFormTable']['reducers'],
    t3: IStoreResults,
    field: string
): IStoreResults => {
    reducers.forEach((reducer: { target: string; type: string; field: string }) => {
        if (reducer.type === 'sum' && reducer.target && t3.values) {
            t3.values[reducer.field] = t3.values[field].reduce(
                (sum: number, b: { [index: string]: string }) => sum + b[reducer.target],
                0
            );
        }
    });

    return t3;
};

/**
 *
 *
 * @export StoreReducer
 * @param {IDefaultState} [state=initState]
 * @param {Action} action
 * @returns {IDefaultState}
 */

const getIndex: (values: any[], results: any) => number = (values: any[], results: any): number =>
    values.findIndex((x1: any) => {
        if (x1[results.key] && results.values[results.key]) {
            return x1[results.key] === results.values[results.key];
        }

        return false;
    });

const getRecord: (record: any[], results: any) => number = (record: any[], results: any): number =>
    record.findIndex((x1: any) => {
        if (results.values && x1[results.values.type] && results.values[results.values.type]) {
            return x1[results.values.type] === results.values[results.values.type];
        }

        return false;
    });

export function StoreReducer(state: IDefaultState = initState, action: Action): IDefaultState {
    /*  tslint:disable:cyclomatic-complexity */

    const results: IStoreResults = (action as IStore).payload;

    switch (action.type) {
        case ADD_DATA:
            const x: IStoreTableState = {
                empty: results.empty,
                error: results.error,
                loaded: results.loaded,
                query: results.query,
                records: results.records,
                store: results.store,
                totalRecords: results.totalRecords,
            };

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: x,
                },
            };

        case ADD_FORM_DATA:
            const ft: IStoreFormState = cloneDeep(state.states[results.store]);

            let y1: IStoreFormState;

            if (ft !== undefined) {
                const form: IStoreFormState['form'] = { ...ft.form, ...results.form };
                y1 = {
                    error: results.error,
                    form,
                    loaded: true, // if it's loaded , don't load again !!
                    store: results.store,
                    target: results.target,
                    values: { ...ft.values, ...results.values },
                };
            } else {
                y1 = {
                    error: results.error,
                    form: results.form,
                    loaded: results.loaded,
                    store: results.store,
                    target: results.target,
                    values: results.values,
                };
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: y1,
                },
            };

        case ADD_STORE:
            const da: IStoreResults = cloneDeep(initialState);
            da.store = results.store;

            if (results && results.loaded) {
                da.loaded = true;
            }

            const st: any = results.query !== undefined ? { ...da, query: results.query } : da;

            if (state.states && state.states[results.store]) {
                return state;
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: st,
                },
            };

        case ADD_STORE_RCD:
            if (!results || !state.states || !state.states[results.store]) {
                return state;
            }

            const t: IStoreResults = cloneDeep(state.states[results.store]);

            if (!t || !t.records || !results.values) {
                return state;
            }

            if (results.unshift) {
                t.records.unshift(results.values);
            } else {
                t.records.push(results.values);
            }
            t.totalRecords = t.records.length;

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t,
                },
            };

        case ADD_STORE_FIELD_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            let t3: IStoreResults = cloneDeep(state.states[results.store]);

            const field: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t3 || !t3.values || !t3.values[field]) {
                return state;
            }

            if (results.unshift) {
                t3.values[field].unshift(results.values);
            } else {
                t3.values[field].push(results.values);
            }

            if (results.options && results.options.reducers) {
                t3 = reduce(results.options.reducers, t3, field);
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t3,
                },
            };

        case REM_STORE_FIELD_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            let t5: IStoreResults = cloneDeep(state.states[results.store]);

            const field2: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t5 || !t5.values || (!t5.values[field2] && results.index)) {
                return state;
            }
            t5.values[field2].splice(results.index, 1);

            if (results.options && results.options.reducers) {
                t5 = reduce(results.options.reducers, t5, field2);
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t5,
                },
            };

        case UPD_STORE_FIELD_RCD:
            if (
                !results ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            let t6: IStoreResults = cloneDeep(state.states[results.store]);

            const field3: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t6 || !t6.values || !t6.values[field3]) {
                return state;
            }

            /** if the index is in the results */

            const idx9: string =
                results.values && !isNaN(results.values.index) && !results.index ? results.values.index : results.index;

            if (typeof results.values === 'string') {
                t6.values[field3] = results.values;
            } else if (results.options && results.options.full) {
                /** adding in case we need to do a full replace */
                t6.values[field3] = results.values;
            } else {
                t6.values[field3][idx9 || 0] = results.values;
            }

            if (results.options && results.options.reducers) {
                t6 = reduce(results.options.reducers, t6, field3);
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t6,
                },
            };

        case ADD_STORE_TABLE_RCD:
            if (
                !results ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const t18: IStoreResults = cloneDeep(state.states[results.store]);

            const field18: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t18 || !t18.values || !t18.values[field18]) {
                return state;
            }

            t18.values[field18].push(results.values);

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t18,
                },
            };

        case APPEND_STORE_TABLE_RCD:
            if (
                !results ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const t19: IStoreResults = cloneDeep(state.states[results.store]);

            const field19: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t19 || !t19.values || !t19.values[field19]) {
                return state;
            }

            t19.values[field19] = t19.values[field19].concat(results.values[field19]);

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t19,
                },
            };

        case REM_STORE_TABLE_RCD:
            if (
                !results ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const t13: IStoreResults = cloneDeep(state.states[results.store]);

            const field13: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t13 || !t13.values || !t13.values[field13]) {
                return state;
            }

            const idx13: number = getIndex(t13.values[field13], results);

            if (idx13 > -1) {
                t13.values[field13].splice(idx13, 1);

                return {
                    ...state,
                    states: {
                        ...state.states,
                        [results.store]: t13,
                    },
                };
            }

            return state;

        case UPD_STORE_TABLE_RCD:
            if (
                !results ||
                !results.store ||
                !results.values ||
                !results.options ||
                !results.options.field ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const t10: IStoreResults = cloneDeep(state.states[results.store]);

            const field4: string = results.options.field;

            /** If no store or if store but no values or store and values but no field */
            if (!t10 || !t10.values || !t10.values[field4]) {
                return state;
            }

            const idx11: number = getIndex(t10.values[field4], results);

            if (idx11 > -1) {
                (Object as any).assign(t10.values[field4][idx11 || 0], results.values);

                return {
                    ...state,
                    states: {
                        ...state.states,
                        [results.store]: t10,
                    },
                };
            }

            return state;

        case RESET_STORE:
            const t4: IStoreResults = cloneDeep(initialState);
            t4.store = results.store;

            if (results && results.loaded) {
                t4.loaded = true;
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t4,
                },
            };

        case RESET_FORM_STORE:
            const y2: IStoreFormState = {
                error: false,
                form: results.form,
                loaded: results.loaded,
                store: results.store,
                target: results.store,
                values: results.values,
            };

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: y2,
                },
            };

        case REM_STORE:
            if (!results || (state.states && !state.states[results.store])) {
                return state;
            }

            const s: any = { ...state.states };

            delete s[results.store];

            return {
                ...state,
                states: {
                    ...s,
                },
            };

        case UPD_STORE:
            if (!results || (state.states && !state.states[results.store])) {
                return state;
            }

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: results.values,
                },
            };

        case UPD_STORE_RECORDS:
            if (!results || (state.states && !state.states[results.store])) {
                return state;
            }

            const t7: any = cloneDeep(state.states[results.store]);
            t7.records = results.values;
            t7.totalRecords = getNbr(results.values);

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t7,
                },
            };

        case UPD_STORE_VALUES:
            if (!results || (state.states && !state.states[results.store])) {
                return state;
            }

            const t9: any = cloneDeep(state.states[results.store]);
            t9.values = results.values;

            return {
                ...state,
                states: {
                    ...state.states,
                    [results.store]: t9,
                },
            };

        case UPD_STORE_RCD:
            if (!results || (state.states && !state.states[results.store])) {
                return state;
            }

            const idx0: number = getIndex(state.states[results.store].records, results);
            if (idx0 > -1) {
                const t1: any = cloneDeep(state.states[results.store]);

                (Object as any).assign(t1.records[idx0], results.values);

                return {
                    ...state,
                    states: {
                        ...state.states,
                        [results.store]: t1,
                    },
                };
            }

            return state;

        case UPD_STORE_FORM_RCD:
            if (state.states && !state.states[results.store]) {
                return state;
            }

            const ft1: any = cloneDeep(state.states[results.store]);

            const UPD1: IStoreFormState = {
                error: results.error,
                form: ft1.form,
                loaded: results.loaded,
                store: results.store,
                target: ft1.target,
                values: { ...ft1.values, ...results.values },
            };

            return { ...state, states: { ...state.states, [results.store]: UPD1 } };

        /* This removes a store record item */
        case REM_STORE_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            let idx1: number = -1;
            if (results.index) {
                idx1 = results.index;
            } else if (results.key) {
                idx1 = getIndex(state.states[results.store].records, results);
            }

            if (idx1 > -1) {
                const t0: any = cloneDeep(state.states[results.store]);
                t0.records.splice([idx1], 1);
                t0.totalRecords = t0.records.length;

                return {
                    ...state,
                    states: {
                        ...state.states,
                        [results.store]: t0,
                    },
                };
            }

            return state;

        /** This removes an item within a table row that is an array @todo  */
        case UPD_STORE_ITEM_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !results.values.type ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const idx3: number = getIndex(state.states[results.store].records, results);

            if (idx3 > -1) {
                const record: any = state.states[results.store].records[idx3][results.values.type];
                if (record) {
                    const ridx: number = results.index ? results.index : getRecord(record, results);

                    if (ridx > -1) {
                        return {
                            ...state.states[results.store].records[idx3][results.values.type][ridx],
                            ...results.values,
                        };
                    }
                }
            }

            return state;

        case REM_STORE_ITEM_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !results.values.type ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const idx4: number = getIndex(state.states[results.store].records, results);

            if (idx4 > -1) {
                const record: any = state.states[results.store].records[idx4][results.values.type];
                if (record !== undefined) {
                    const ridx: number = results.index !== undefined ? results.index : getRecord(record, results);

                    if (ridx > -1) {
                        return state.states[results.store].records[idx4][results.values.type].splice(ridx, 1);
                    }
                }
            }

            return state;

        case ADD_STORE_ITEM_RCD:
            if (
                !results ||
                !results.key ||
                !results.store ||
                !results.values ||
                !results.values.type ||
                !state.states ||
                !state.states[results.store]
            ) {
                return state;
            }

            const idx5: number = getIndex(state.states[results.store].records, results);

            if (idx5 > -1 && state.states[results.store].records[idx5]) {
                const record: any = state.states[results.store].records[idx5][results.values.type];
                if (record === undefined) {
                    state.states[results.store].records[idx5][results.values.type] = [];
                }
                state.states[results.store].records[idx5][results.values.type].push(results.values);
            }

            return state;

        default:
            return state;
    }
}

export const OA: any = (A: any, B: any): any => (Object as any).assign({}, A, B);

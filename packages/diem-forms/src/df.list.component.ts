/* eslint-disable class-methods-use-this */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
    HostBinding,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { isEmpty, cloneDeep, merge } from 'lodash-es';
import { map, take } from 'rxjs/operators';
import { Env } from '@mydiem/diem-angular-util';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DFCommonService } from './df.common.api';
import { DFFilterService } from './df.filter.service';
import { ILocals, IParams, IAction, IFormSpecs } from './definitions/interfaces';
import { DFStoreFunctions } from './df.store.functions';
import { tmpl } from './templates/df.list.pug.tmpl';

interface IStoreData {
    records: any[];
    query: IQuery;
    loaded: boolean;
    totalRecords: number;
}

interface IQuery {
    first: number;
    page: number;
    rows: number;
}

type TableRowSize = 'sm' | 'sh' | 'md' | 'lg';

interface IColumnSpecs {
    checkbox?: boolean;
    radio: string;
    link?: boolean;
    target?: string;
    datakey: string;
    datakeyonly: boolean;
}

interface ITableColumn {
    width?: string;
    header: string;
    specs?: IColumnSpecs;
    style: any;
    action: {
        type?: string;
        noclose?: boolean;
        locals?: {
            store?: string;
            type?: string;
            reset?: boolean;
        };
    };
    template?: any;
}

interface ITableColumnHeader {
    specs?: IColumnSpecs;
    ascending: boolean;
    sorted: boolean;
    data: ITableColumn;
    field: string;
}

interface ITableSpecs {
    class: string;
    columns: ITableColumn[];
    emptyMessage: string;
    expandable: boolean;
    id: string;
    lazy: boolean;
    noBorder: boolean;
    paginator: boolean;
    preload: boolean;
    query: any;
    readmode: boolean;
    rowsPerPage: string;
    showSelectionColumn: boolean; // shows the checkbox
    size: string;
    sortable: boolean;
    special: string[];
    striped: boolean;
    tableClass: string; // cds--data-table--sticky-header
    tableStyle: any; // typestyle
    type: TableRowSize;
    header: {
        title: string;
        description: string;
    };
    toolbar: {
        buttons: any[];
        visible?: boolean | string;
        form: {
            locals: any;
            values: any;
        };
    };
    template: {
        locals: any;
        values: any;
    };
}

interface IpaginatorModel {
    data: any[];
    totalDataLength: number;
    pageLength: number;
    currentPage: number;
}

const query: IQuery = {
    page: 1,
    first: 0,
    rows: 0,
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-list',
    template: tmpl,
})
export class DFListComponent implements OnDestroy, OnInit {
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @HostBinding('class') @Input() class: string = '';
    @ViewChild('colheader', { static: true }) public colheader!: TemplateRef<any>; /** ! Will come later */
    @Input() public locals!: ILocals;
    @Input() public params: IParams = {
        query,
    };
    @Input() public tableSpecs!: ITableSpecs;
    @Input() public values: any;
    @Input() public formSpecs?: IFormSpecs; /** ! Added Later */

    public storeData: IStoreData = {
        records: [],
        query,
        loaded: false,
        totalRecords: 0,
    };

    public FSSub!: Subscription;
    public FSStore!: Subscription; /** ! added later */
    public FFSSub!: Subscription;
    public links: any;
    public icons: any;
    public table: any;
    public storeName?: string;
    public loading: boolean = false;

    public selectedItems: any[] = [];
    public detailsType?: string[];
    public loaded: boolean; // used for checking if a component is already inititalized

    public store: Store<any>;
    public DSF: DFStoreFunctions;
    public env: Env;

    public allchecked: boolean = false;

    public paginatorModel: IpaginatorModel = {
        data: [[]],
        totalDataLength: 0,
        pageLength: 0,
        currentPage: 0,
    };

    private paginatorModelCheck: number = 0;
    private formSubscription!: Subscription; /** ! added later */
    private route: ActivatedRoute;
    private cd: ChangeDetectorRef;
    private FS: DFFilterService;
    private DFCS: DFCommonService;
    private sanitizer: DomSanitizer;

    public constructor(
        env: Env,
        store: Store<any>,
        DSF: DFStoreFunctions,
        route: ActivatedRoute,
        cd: ChangeDetectorRef,
        FS: DFFilterService,
        DFCS: DFCommonService,
        sanitizer: DomSanitizer,
    ) {
        this.env = env;
        this.loaded = false;
        this.store = store;
        this.DSF = DSF;
        this.route = route;
        this.cd = cd;
        this.FS = FS;
        this.DFCS = DFCS;
        this.sanitizer = sanitizer;
    }

    /* tslint:disable cognitive-complexity*/
    public ngOnInit(): void {
        if (this.tableSpecs.lazy) {
            this.loading = true;
        } // if there's lazy load then no default loading

        if (this.formSpecs && this.formSpecs.readmode === false && this.tableSpecs && this.tableSpecs.readmode) {
            this.tableSpecs.readmode = this.formSpecs.readmode;
        }

        // params and params quer are very important so make sure we have them

        if (!this.params || Object.keys(this.params).length === 0) {
            this.params = { query };
        }

        if (!this.params.query) {
            this.params.query = query;
        }

        // paginator is also important so make sure it's available

        if (this.tableSpecs.paginator) {
            this.paginatorModel = {
                data: [[]],
                totalDataLength: this.storeData.totalRecords || 0,
                pageLength: this.params.query.rows || 20,
                currentPage: this.storeData.query.page || 1,
            };

            this.paginatorModelCheck = this.paginatorModel.currentPage * this.paginatorModel.pageLength;
        }

        /** detailstype is used in the table for the expander links , text etx..
         * yçu can even embed a form using formLocals
         */

        this.evaluate(this.locals);
        this.evaluate(this.params);

        /* get the storeName */

        this.storeName = this.locals.nested
            ? this.DSF.r_getStore(`${this.locals.store}-${this.values[this.locals.nested]}`)
            : this.DSF.r_getStore(this.locals.store);

        // Initializing the store with default values, if already exists, then store will be reused

        const preload: boolean = this.tableSpecs.preload ? true : false;

        if (!(this.locals.options && this.locals.options.field)) {
            /** this store is not a standalone so does not need to be initialized */
            this.DSF.initStore(this.storeName, this.params.query, preload);
        }

        // listen for messages
        this.formSubscribe();

        if (this.locals.reset) {
            /** ia rest has been asked so we are resetting the store */
            this.DSF.resetStore(this.storeName, preload);
        }

        // Subscribing to that store

        this.FSStore = this.store
            .pipe(
                select((s) => {
                    if (this.storeName) {
                        return s.coverage.states[this.storeName];
                    }
                }),
                map((s) => {
                    /** In the event the table data are from a form field then we need to get only the values
                     * of that field, the name is triggered by the options.key and also the options.id;
                     */
                    if (this.locals.options && this.locals.options.field && s.values) {
                        const records: any = s.values[this.locals.options.field];

                        if (records && records.records) {
                            return {
                                loaded: true,
                                query,
                                ...records,
                            };
                        }

                        return {
                            loaded: true,
                            query,
                            records: records || [],
                        };
                    }

                    return s;
                }),
            )
            .subscribe((data: any) => {
                if (!data || (data && !data.records)) {
                    return; // no data or no records then nothing to do here
                }
                this.storeData = cloneDeep(data);

                if (this.storeData.query && this.params && this.params.query) {
                    this.params.query = this.DSF.OA(this.params.query, this.storeData.query);
                }

                /* a class to indicate table is loaded */
                if (this.storeData && this.storeData.loaded) {
                    this.loading = false;
                    this.DFCS.formChanged({ table: this.tableSpecs.id, loaded: true });

                    this.check('ngOnInit-storedata');
                }
                this.selectedItems = [];
                // OPTIMIZATION this.check('ngOnInit-storedata');

                if (this.tableSpecs.paginator) {
                    this.paginatorModel.totalDataLength = this.storeData.totalRecords;
                    this.paginatorModel.pageLength = this.params.query.rows;
                    this.paginatorModel.currentPage = this.storeData.query.page;
                    this.paginatorModelCheck = this.paginatorModel.currentPage * this.paginatorModel.pageLength;
                }
            });

        this.FSSub = this.FS.filterUpdate.subscribe((results) => {
            if (results.store === this.storeName) {
                /** get the params from the filter and apply them to the table */
                results.query.first = 0; /* always start from the beginning */
                this.storeData.query.first = 0;
                this.DSF.OAA(this.params.query, results.query);
                this.storeData.loaded = false;
                this.loadIt(1); // reset any filtes
            }
        });

        /* If we have required query parameters on the params then
         * we need to assume that they need data from the store
         * so lets get them for the store
         */

        // Read queryparams from the url and if found object merge them to the params.query
        this.params.query = this.DSF.OA(this.params.query, this.DSF.r_qP(this.route));

        this.loadIt(1);

        console.info(`$df.list.component (ngOnit): done using store => ${this.storeName}`);
    }

    public loadIt = (event: number): void => {
        if (
            !this.tableSpecs.lazy &&
            this.storeData &&
            this.storeData.loaded &&
            event * this.paginatorModel.pageLength === this.paginatorModelCheck
        ) {
            console.info(`$df.list.component (loadIt) => using existing store : ${this.storeName}`);

            return;
        }

        if (this.locals.required) {
            const required: any = this.locals.required;
            const storeId: string = this.DSF.r_getStore(required.store);
            this.FFSSub = this.store
                .pipe(
                    select((s: any) => s.coverage.states[storeId]),
                    take(1),
                )
                .subscribe((data: any) => {
                    /** we need to have data
                     * AND data values
                     * and ( also the data are not already loaded from the sever
                     * or they may have been loaded but a reset has been asked
                     * and ( the number of rows are different or the first are different)
                     */

                    if (data && !isEmpty(data.values)) {
                        const obj: any = {};
                        required.fields.forEach((f: any) => {
                            obj[f.in] = data.values[f.out];
                        });
                        this.params.query = this.DSF.OA(this.params.query, obj);

                        /* wehn the components may only be initialized if data it depends on has been loaded
                         * if it has not been loaded then the component is initialized without data
                         * therefore we need to load the data once the dependend data come in .
                         */
                        this.loadParams(event);
                    }
                });
        } else {
            this.loadParams(event);
        }
    };

    public loadParams = (event: number): void => {
        const rows: number = this.paginatorModel.pageLength;
        const first: number = event ? (event - 1) * rows : 0;

        this.params = {
            ...this.params,
            query: {
                ...this.params.query,
                page: event || 1,
                first, // important deduct 1 as we need for first starting numbers 0 10 20 etc..
                rows,
                sortField: this.params.query.sortField ? this.params.query.sortField : undefined,
                sortOrder: this.params.query.sortOrder ? this.params.query.sortOrder : undefined,
            },
        };
        this.load();
    };

    public formSubscribe = () => {
        this.formSubscription = this.DFCS.form$.subscribe((action: IAction) => {
            if (action.type === 'edit') {
                this.editMode();
            } else if (['read', 'cancel'].includes(action.type)) {
                this.readMode();
            } else if (action.type === 'reload') {
                this.loadIt(1);
            }
        });
    };

    public load = (): void => {
        if (!this.storeName) {
            return;
        }

        this.loading = true;
        this.DSF.loadStore(this.params, this.locals, this.storeName);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onRowExpand = (_event: any): void => this.check('onRowExpand');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public isType = (_type: string): boolean => (this.detailsType && this.detailsType.length > 0 ? true : false);

    public onAction = (action: any, options?: any): void => {
        /** Options using the spread operator is return as an arry
         * therefore we take the first element
         */
        this.DFCS.formChanged(merge(options, action));
    };

    public getQuery = (action: any): void => {
        this.DFCS.formChanged({
            ...action,
            values: { query: this.params.query },
        });
    };

    public onRowSelect = (_row: any, checked: boolean) => {
        /** this is a little function to get the action from the config definition for that column
         * it can only be radio or checkbox
         *
         * @todo complete checkbox
         *
         * Attention filter returns an array when filtering an array
         */

        const row = structuredClone(_row);

        const colVal: any[] =
            this.tableSpecs.columns.filter((col: any) =>
                // find only radios or checkboxes, there can only be one of them
                col.specs && (col.specs.radio || col.specs.checkbox) && col.action ? true : false,
            ) || [];

        if (colVal.length > 0) {
            const col: ITableColumn = colVal[0];
            if (colVal[0].specs.radio) {
                this.DFCS.formChanged({ ...col.action, values: row });
            } else {
                this.updateSelectedItems(row, checked, col);

                this.DFCS.formChanged({ ...col.action, values: { records: [...this.selectedItems] } });
            }
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onHeaderCheckboxToggle = (e: boolean) => {
        /** this is a little function to get the action from the config definition for that column
         * it can only be radio or checkbox
         *
         * @todo complete checkbox
         *
         * Attention filter returns an array when filtering an array
         */
        const colVal: any =
            this.tableSpecs.columns.filter((col: any) =>
                col.specs && col.specs.checkbox && col.action ? true : false,
            ) || [];

        if (colVal.length > 0) {
            const col: ITableColumn = colVal[0];
            this.updateAllSelectedItems(col, e);
            this.DFCS.formChanged({ ...colVal[0].action, values: { records: [...this.selectedItems] } });
        }
    };

    public getValue: any = (item: any, field: string, subfield: string): any => {
        if (subfield === undefined) {
            return item[field];
        }

        return item[field][subfield];
    };

    public loadNode = (event: any): void => {
        if (event.node) {
            const paramsQuery: any = [];
            let pVal: string = '';
            for (const q of this.tableSpecs.query) {
                if (q.value instanceof Array) {
                    for (const v of q.value) {
                        pVal = !pVal ? event.node.data[v] : `${pVal},${event.node.data[v]}`;
                    }
                } else {
                    pVal = event.node.data[q.value];
                }
                paramsQuery[q.key] = pVal;
            }
            this.params.query = paramsQuery;

            if (!event.node.children) {
                this.DSF.loadNode(this.params, this.locals).catch((err: Error) => {
                    console.info('$df.list.component (loadnode) => error', err);
                });
            }
        }
    };

    public onNodeExpand = (event: any): void => {
        if (event.node && event.node.leaf === undefined) {
            return;
        }

        this.loading = true;

        const params: any = { ...this.storeData.query, ...event.node.data };
        params.parent = event.node.parent && event.node.parent.data ? event.node.parent.data : undefined;
        params.leaf = event.node.leaf;

        /** maybe hack to refresh the data */
        const newRecords: any[] = [...this.storeData.records];

        this.DSF.loadNode(params, this.locals)
            .then((children: any) => {
                this.loading = false;
                event.node.children = children;
                this.storeData.records = newRecords; // round trip to refresh the data
                this.check('onNodeExpand');
            })
            .catch(() => {
                this.loading = false;
                event.node.children = {};
                this.storeData.records = newRecords; // round trip to refresh the data
                const err: any = 'Sorry, we could not load your data';
                this.DSF.siteError(err);
                this.check('onNodeExpand');
            });
    };

    public sort = (col: ITableColumnHeader) => {
        col.sorted = true;
        col.ascending = !col.ascending;
        this.params.query.sortField = col.field;
        this.params.query.sortOrder = col.ascending ? 1 : -1;
        this.storeData.loaded = false;
        this.loadIt(1);
    };

    public getColumn = (col: ITableColumnHeader) => ({ ...col, template: this.colheader, data: col });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public trackByFn = (index: number, _item: any) => index; // or item.id

    public summaryMessage = () => {
        const f: number = this.storeData.query.first;
        const r: number = this.storeData.totalRecords;
        const e: number = f + this.storeData.query.rows < r ? f + this.storeData.query.rows : r;

        const z: number = r === 0 ? 0 : f + 1;

        return `Displaying records ${z} to ${e} from ${r}`;
    };

    public evalStr = (str?: string | boolean): any => {
        if (typeof str === 'boolean') {
            return str;
        }

        if (!str) {
            return true;
        }

        return Function(`"use strict";return (${str})`).call(this);
    };

    public editMode = (): void => {
        if (this.tableSpecs.readmode) {
            this.tableSpecs.readmode = false;
        }
        console.info(`$df.list.component (editMode) => ${this.locals.formName}`);
        this.check('editMode');
    };

    public readMode = (): void => {
        if (!this.tableSpecs.readmode) {
            this.tableSpecs.readmode = true;
        }
        console.info(`$df.list.component (readMode) => ${this.locals.formName}`);
        this.check('readMode');
    };

    public html = (value: any): SafeHtml => this.sanitizer.bypassSecurityTrustHtml(value);

    public guid: () => string = () => this.DFCS.guid();

    public ngOnDestroy(): void {
        /** a security to ensure that we always start with a not loaded component
         * usecase when the localdata is not destroyed
         */

        /** prevent memory leak when component destroyed */
        if (this.FSSub !== undefined) {
            this.FSSub.unsubscribe();
        }
        if (this.FSStore !== undefined) {
            this.FSStore.unsubscribe();
        }
        if (this.FFSSub !== undefined) {
            this.FFSSub.unsubscribe();
        }

        if (this.formSubscription !== undefined) {
            this.formSubscription.unsubscribe();
        }

        console.info(`$df.list.component (ngOnDestroy) => destroying store ${this.storeName}`);
    }

    private updateSelectedItems = (row: any, checked: boolean, col: ITableColumn): void => {
        const key: string = col.specs && col.specs.datakey ? col.specs.datakey : row.id;

        if (!key) {
            return;
        }

        if (checked) {
            row.selected = true;
            const value: any = col.specs && col.specs.datakeyonly ? { [key]: row[key] } : { ...row };

            this.selectedItems.push(value);
        } else {
            row.selected = false;
            this.selectedItems = this.selectedItems.filter((obj: any) => obj[key] !== row[key]);
        }
    };

    private updateAllSelectedItems = (col: ITableColumn, checked: boolean): void => {
        this.selectedItems = structuredClone(this.selectedItems);

        if (checked) {
            this.storeData.records.forEach((row: any) => {
                row.selected = true;
                const key: string = col.specs && col.specs.datakey ? col.specs.datakey : row.id;
                if (key) {
                    const value: any = col.specs && col.specs.datakeyonly ? { [key]: row[key] } : { ...row };
                    this.selectedItems.push(value);
                }
            });
            this.allchecked = true;
        } else {
            this.storeData.records.forEach((row: any) => {
                row.selected = false;
            });
            this.selectedItems = [];
            this.allchecked = false;
        }
    };

    private evaluate = (obj: any): void => {
        for (const p in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, p)) {
                let evalP: string = obj[p];
                if (evalP !== '') {
                    try {
                        evalP = Function(`"use strict";return (${obj[p]})`).call(this);
                    } catch (e) {
                        evalP = obj[p];
                    }
                    if (obj[p] !== evalP && !this.checknode(evalP)) {
                        obj[p] = evalP;
                    }
                    if (typeof obj[p] === 'object') {
                        this.evaluate(obj[p]);
                    }
                }
            }
        }
    };

    private checknode: any = (evalP: any): boolean =>
        evalP instanceof HTMLCollection || evalP instanceof NodeList || evalP instanceof HTMLElement ? true : false;

    private check = (from: string) => {
        console.info(`%c$df.list.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}

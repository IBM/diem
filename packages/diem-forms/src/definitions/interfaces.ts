/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/indent */
import { TemplateRef } from '@angular/core';
import { QuestionGroup } from '../definitions/question-group';
import { IDFQuestionTableListComponent } from '../df.table.list.component';
import { ICalendarQuestion } from './question-calendar';
import { IAutoCompleteQuestion } from './question-autocomplete';
import { INumberQuestion } from './question-number';
import { IDropdownQuestion } from './question-dropdown';
import { ITextboxQuestion } from './question-textbox';
import { IUploadQuestion } from './question-upload';
import { ICodeEditorQuestion } from './question-codeeditor';
import { IEditorQuestion } from './question-editor';
import { ICheckboxQuestion } from './question-checkbox';
import { IChipsQuestion } from './question-chips';
import { IButtonQuestion } from './question-button';
import { IToggleQuestion } from './question-toggle';
import { ITableQuestion } from './question-table';
import { ITextareaQuestion } from './question-textarea';
import { IRadioQuestion } from './question-radio';
import { IOverflowQuestion } from './question-overflow';

export interface IQuestion
    extends IQuestionBase,
        IAutoCompleteQuestion,
        IButtonQuestion,
        ICalendarQuestion,
        ICheckboxQuestion,
        IChipsQuestion,
        ICodeEditorQuestion,
        IEditorQuestion,
        IDropdownQuestion,
        INumberQuestion,
        IRadioQuestion,
        ITableQuestion,
        ITextareaQuestion,
        ITextboxQuestion,
        IToggleQuestion,
        IUploadQuestion,
        IOverflowQuestion,
        IDFQuestionTableListComponent {
    dummy: boolean;
}

export interface IItem {
    content: string;
    id: string | number;
    selected?: boolean;
}

interface IDependency {
    type: string;
    key: string;
    condition: string;
    watch: string[] | string;
    disable: boolean;
    keepValue: boolean;
}

export interface IQuestionBase {
    action?: any;
    class?: string;
    compute: string;
    computeWhenComposed: string;
    dependency?: IDependency[];
    disabled: boolean;
    disabledWhen: string;
    displayName?: string;
    editOnly?: boolean; // form control only enabled in editmode
    editMode?: string /** indicates if a the view template should be in edit mode */;
    fromEnv?: any;
    helperText?: string;
    invalidText?: string;
    hidden?: boolean | string /** indicates if a question should be hidden or not, it still exists */;
    iconStyle?: string;
    invalid?: string | boolean;
    items: IItem[];
    key?: string;
    label?: string;
    labelStyle?: any;
    model?: any;
    order?: number;
    placeHolder: string;
    readMode?: string /** indicates if a the view template should be in read mode */;
    readOnly?: boolean | string;
    readTypeClass?: string;
    required?: boolean;
    requiredWhen?: string;
    subClass?: string;
    subStyle?: any;
    text?: string;
    typeClass?: string;
    typeStyle?: string;
    value?: any;
    visible?: boolean | string /** indicates if a question should be completely visible or not, it won't exist */;
}

/**
 * This is the actions interface used in forms and table
 *
 * @export
 * @interface IAction
 * @todo reload where is this used
 */
export interface IAction {
    type: string;
    target: string | string[] /* the target store */;
    values: any[];
    reset?: boolean /* boolean to reset the store */;
    modalOptions: any;
    params: IParams;
    locals: ILocals;
    reload?: boolean;
}

interface IFormSpecsStyle {
    buttonClass?: string;
    fieldsetClass?: string;
    fieldsetStyle?: string;
    formClass?: string;
    groupBodyClass?: string;
    groupClass?: string;
    panelClass?: string;
    panelStyle?: string;
    sectionPanelClass?: string;
    sectionPanelStyle?: string;
    readClass?: string;
    type: string;
}

interface IFormSpecsButtons {
    click: any;
    class?: string;
    disabled: boolean;
    label: string;
    visible: boolean;
}

export interface IFormSpecs {
    buttons?: IFormSpecsButtons[];
    buttonsattop?: boolean;
    disabled?: boolean;
    groups?: QuestionGroup<any>[];
    id: string;
    editmode?: boolean;
    readmode?: boolean;
    style: IFormSpecsStyle;
    submitted?: boolean;
    type: string;
    fieldset?: {
        toggleable?: boolean;
        collapsed?: boolean;
        header?: string;
    };
    sidebar?: {
        title: string;
        class: string;
        style: any;
    };
}

interface IRecord {
    [index: string]: any;
}

/**
 * The interface for handling and updating store values related to a table
 *
 * @param {values} values {} for adding up updating a table row
 * @param {records} records Array that contains the store records
 * @interface IStoreTableState
 */
export interface IStoreTableState {
    key?: string;
    unshift?: boolean;
    empty?: boolean;
    error: boolean;
    loaded: boolean;
    query?: any;
    records?: IRecord[];
    store: string;
    totalRecords?: number;
    index?: number;
    values?: IRecord;
    options?: IStoreFormTable;
}

/**
 * The interface for handling and updating store values related to a form
 *
 * @param {values} values {} for updating the state
 * @param {error} error boolean indicates an error
 * @interface IStoreFormState
 */
export interface IStoreFormState {
    error: boolean;
    form?: {
        name?: string;
        valid?: boolean;
    };
    loaded: boolean;
    store: string;
    target?: string;
    values?: IRecord;
}

export interface IStoreFormTable {
    field: string;
    values: any;
    key: string;
    full?: boolean;
    reducers?: {
        target: string;
        type: string;
        field: string;
    }[];
}

/**
 * These are all possible values that can be used for store updates
 *
 * @extends {IStoreFormState}
 * @extends {IStoreTableState}
 */
export interface IStoreResults extends IStoreFormState, IStoreTableState {
    [index: string]: any;
}

export interface IStore {
    payload: IStoreResults;
    type: string;
}

export interface IParams {
    query: any;
}

export interface ILocals {
    api: string;
    base: string;
    changed?: boolean;
    disabled?: boolean;
    flatten?: boolean; // is the object to be flattened or not
    formName?: string;
    loaded: boolean;
    proxyurl?: string;
    editmode?: boolean;
    readmode?: boolean;
    required?: any[];
    reset?: boolean;
    store: string;
    submitted?: boolean;
    token: string;
    type: string;
    url: string;
    target?: string;
    fromStore?: boolean;
    toStore?: boolean;
    nested?: string;
    fieldset?: {
        toggleable?: boolean;
        collapsed?: boolean;
        header?: string;
    };
    options?: IStoreFormTable;
}

/**
 * @param {api} api name of the landing point
 * @param {fromServer?} fromServer boolean if this needs to go to the store
 * @param {fromStore} fromStore boolean if this needs to come from the store
 * @todo
 * @interface IForm
 */
export interface IForm {
    api?: string;
    base?: string;
    changed?: boolean; // can be deleted i think
    collapsed?: boolean;
    disabled?: boolean;
    filterStore?: string;
    flatten?: boolean; // is the object to be flattened or not
    formName: string;
    fromServer?: boolean;
    fromStore?: boolean;
    input?: any;
    loaded?: boolean;
    map?: any;
    output?: any;
    params: IParams;
    prevalidate?: boolean;
    editmode?: boolean;
    readmode?: boolean;
    required?: any;
    reset?: boolean;
    store?: string;
    submitted?: boolean;
    target?: string;
    toStore?: boolean;
    toggleable?: boolean;
    updateStore?: boolean; // to indicate it's a form and not a filter
    url?: string;
    values?: any;
}

interface IFormParams {
    addStores: any;
    locals: ILocals;
    modalOptions: any;
    params: any;
    values: any;
    return: any;
    processing: boolean;
    required: boolean;
    store: string;
    targetStore: string;
    keepModal: boolean;
}

interface IntSharedAction {
    sessionid?: string;
    type: string;
    target?: string;
    targetid?: string;
    params?: {
        [index: string]: any;
        route?: string;
    };
}

export interface IOptions extends IntSharedAction, IStoreTableState, IStoreFormState {
    type: string; // the type of the option
    params: IFormParams;
    locals: ILocals;
    values: any;
    modalOptions: IModalOptions;
    noclose: boolean; // defines if a modal should be closed of not
}

export interface IData {
    values: { [index: string]: any };
    loaded: boolean;
}

export interface IHeader {
    title: string;
    buttonTitle?: string;
    buttonLink?: string;
    headerColor?: string;
    headerIcon?: string;
}

export interface ITabHeader {
    label?: string;
    class?: string;
    panelClass?: string;
    iconClass?: string;
    tabstype?: string;
}

export interface IBaseUrl {
    url: string;
    key: string;
    url2?: string;
    key2?: string;
    noTransfer: boolean;
}

interface IHeaderButton {
    visible: boolean | string;
    title: string;
    link: string;
    class: string;
    altText?: string;
    altStyle?: { [index: string]: any };
    action: any;
    iconClass?: string;
    iconStyle?: string;
    style?: string;
    type: string;
    focus?: string | null;
    label: string;
    size?: string;
}

export interface IConfig {
    type: string;
    header: {
        title: string;
        buttonLink?: string;
        buttonTitle?: string;
        headerColor?: string;
        headerIcon?: string;
        button?: IHeaderButton;
    };
    baseUrl: IBaseUrl;
    title: string;
    store: any;
    err: Error;
    headerTmpl: string;
    key: string;
    resetvalues: boolean;
    history: any;
    formName: string;
    reset?: boolean;
    values?: any;
    steps?: string;
    params: IParams;
    locals: ILocals;
    documentation?: boolean;
    filter?: any;
    construct: any;
}

export interface IStoreMessageState {
    detail: string;
    key: string;
    life?: number;
    nostack?: boolean;
    severity?: string;
    sticky?: boolean;
    summary?: string;
    type: string; // used only by the site store
}

/**
 * @description Defines the modal options to be used for opening
 * a modal
 *
 * Includes template name, options, message, Number and error
 *
 */
type ModalTypes = 'xs' | 'sm' | 'default' | 'lg';

export interface IModalOptions {
    template?: TemplateRef<any>;
    options?: any;
    /** message is used for streaming messages */
    message?: string;
    spinner?: boolean; // used for displaying a processing in the modal
    close?: boolean;
    error?: boolean;
    /** the modal context check this out it makes values availe to the modal */
    context?: any;
    size?: ModalTypes;
}

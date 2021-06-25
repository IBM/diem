/* eslint-disable @typescript-eslint/ban-types */

import { IQuestionBase, IItem } from './interfaces';

export class QuestionBase<T> implements IQuestionBase {
    public action?: any;
    public class?: string;
    public compute: string;
    public computeWhenComposed: string;
    public disabled: boolean;
    public disabledWhen: string;
    public editMode?: string;
    public editOnly?: boolean;
    public helperText?: string;
    public hidden?: boolean | string;
    public iconClass?: string;
    public iconStyle?: string;
    public items: IItem[];
    public invalidText?: string;
    public key?: string;
    public label?: string;
    public labelStyle?: any;
    public max?: number | null;
    public min?: number | null;
    public maxLength?: number;
    public minLength?: number;
    public model?: any;
    public order?: number;
    public placeHolder: string;
    public readMode?: string;
    public readOnly?: boolean | string;
    public readTypeClass?: string;
    public required?: boolean;
    public requiredWhen?: string;
    public size?: string;
    public subClass?: string;
    public subStyle?: string;
    public style?: any;
    public type!: string;
    public typeClass?: string;
    public typeStyle?: string;
    public value?: T;
    public visible?: boolean | string;
    public dependency?: {
        type: string;
        key: string;
        condition: string;
        watch: string[] | string;
        disable: boolean;
        keepValue: boolean;
    }[];

    public constructor(options: {
        dependency?: {
            type: string;
            key: string;
            condition: string;
            watch: any[] | string;
            disable: boolean;
            keepValue: boolean;
        }[];
        action?: any;
        class?: string;
        compute: string;
        computeWhenComposed: string;
        disabled: boolean;
        disabledWhen: string;
        displayName?: string;
        editMode?: string;
        helperText?: string;
        fromEnv?: any;
        hidden?: boolean | string;
        iconClass?: string;
        iconStyle?: string;
        invalidText: string;
        items: IItem[];
        key?: string;
        label?: string;
        labelStyle?: any;
        order?: number;
        placeHolder: string;
        readMode?: string;
        readOnly?: boolean | string;
        readTypeClass?: string;
        required?: boolean;
        requiredWhen?: string;
        size: string; // xl sm
        style?: any;
        subClass?: string;
        typeClass?: string;
        typeStyle?: string;
        value?: any;
        visible?: boolean | string;
    }) {
        this.action = options.action;
        this.class = options.class;
        this.compute = options.compute;
        this.computeWhenComposed = options.computeWhenComposed;
        this.dependency = options.dependency;
        this.disabled = options.disabled || false;
        this.disabledWhen = options.disabledWhen;
        this.editMode = options.editMode;
        this.helperText = options.helperText;
        this.hidden = options.hidden || false;
        this.iconClass = options.iconClass;
        this.invalidText = options.invalidText || 'Incorrect Value';
        this.items = options.items;
        this.key = options.key;
        this.label = options.label;
        this.labelStyle = options.labelStyle || undefined;
        this.order = options.order === undefined ? 1 : options.order;
        this.placeHolder = options.placeHolder || 'Enter your text';
        this.readMode = options.readMode;
        this.readOnly = options.readOnly || false;
        this.readTypeClass = options.readTypeClass;
        this.required = !!options.required;
        this.requiredWhen = options.requiredWhen;
        this.size = options.size;
        this.style = options.style;
        this.subClass = options.subClass || '';
        this.typeClass = options.typeClass;
        this.typeStyle = options.typeStyle;
        this.value = options.value;
        this.visible = options.visible;
    }
}

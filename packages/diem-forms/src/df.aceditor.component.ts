/* eslint-disable @typescript-eslint/ban-types */
import {
    Component,
    ElementRef,
    forwardRef,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
    NgZone,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import * as ace from 'ace-builds';

const acePath: string = 'ace-builds/src-min-noconflict/';
ace.config.set('basePath', `${process.env.APPPATH}/${acePath}`);
ace.config.setModuleUrl('ace/mode/python', `${process.env.APPPATH}/${acePath}mode-python.js`);
ace.config.setModuleUrl('ace/mode/json', `${process.env.APPPATH}/${acePath}mode-json.js`);
ace.config.setModuleUrl('ace/mode/sql', `${process.env.APPPATH}/${acePath}mode-sql.js`);
ace.config.setModuleUrl('ace/mode/text', `${process.env.APPPATH}/${acePath}mode-text.js`);
ace.config.set('loadWorkerFromBlob', false);

interface IStyle {
    [index: string]: string;
}

const CODEEDITOR_VALUE_ACCESSOR: any = {
    multi: true,
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AceCodeEditorComponent),
};

@Component({
    providers: [CODEEDITOR_VALUE_ACCESSOR],
    selector: 'df-ace-editor',
    template: '<div #codeeditor [ngStyle]="style" [ngClass]="class"></div>',
})
export class AceCodeEditorComponent implements OnInit, ControlValueAccessor, OnChanges, OnDestroy {
    @ViewChild('codeeditor', { static: true }) public codeEditorElmRef!: ElementRef;
    @Input() public mode?: string;
    @Input() public theme?: string;
    @Input() public readOnly: boolean = false;
    @Input() public style?: IStyle;
    @Input() public key?: string;
    @Input() public codeoptions?: any;

    public value: any;

    public class: string[] = [];

    private codeEditor!: ace.Ace.Editor;
    private stream: Subject<any> = new Subject<any>();
    private subscription: Subscription;

    private zone: NgZone;

    public constructor(zone: NgZone) {
        this.zone = zone;

        this.subscription = this.stream.pipe(debounceTime(500)).subscribe((value: any) => this.onModelChange(value));
    }

    public onTouch: () => {} = () => false;
    public onModelChange: (fn: any) => {} = () => false;

    public registerOnTouched: any = (fn: any) => {
        this.onTouch = fn;
    };
    public registerOnChange: any = (fn: any) => {
        this.onModelChange = fn;
    };

    public ngOnChanges(change: SimpleChanges): void {
        if (change.readOnly && typeof change.readOnly.currentValue === 'boolean' && this.codeEditor) {
            this.codeEditor.setReadOnly(change.readOnly.currentValue);

            this.class = change.readOnly.currentValue ? ['read'] : [];
        }
    }

    public writeValue: any = (value: any) => {
        if (value && typeof value === 'string') {
            //* this.codeEditorContent = value;
            if (this.codeEditor) {
                this.codeEditor.setValue(value);
                this.codeEditor.clearSelection();
            } else {
                this.value = value;
            }
        }
    };

    public ngOnInit(): any {
        const element: any = this.codeEditorElmRef.nativeElement;

        const codeoptions: any = {
            showLineNumbers: true,
            tabSize: 2,
            useWorker: true,
        };

        this.codeoptions = { ...codeoptions, ...this.codeoptions };

        this.zone.runOutsideAngular(() => {
            this.codeEditor = ace.edit(element, this.codeoptions);
        });

        this.codeEditor.getSession().setMode(`ace/mode/${this.calcMode(this.key)}`);
        this.codeEditor.setTheme(`ace/theme/${this.theme || 'chrome'}`);

        this.codeEditor.setReadOnly(this.readOnly);
        if (this.readOnly) {
            this.class = ['read'];
        }

        if (this.value) {
            this.codeEditor.setValue(this.value);
        }

        this.codeEditor.on('change', () => {
            const content: any = this.codeEditor.getValue();
            this.stream.next(content);
        });

        this.codeEditor.clearSelection();
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private calcMode = (key?: string): string => {
        let calcmode: string = 'text';

        if (key) {
            key.toLowerCase();
            if (key.includes('url')) {
                calcmode = 'json';
            } else if (key.includes('py')) {
                calcmode = 'python';
            } else if (key.includes('json')) {
                calcmode = 'json';
            } else if (key.includes('sql')) {
                calcmode = 'sql';
            } else if (this.mode) {
                calcmode = this.mode;
            }
        } else if (this.mode) {
            calcmode = this.mode;
        }

        console.info(`$df.ace.editor (calcMode): calculated mode: ${calcmode}`);

        return calcmode;
    };
}

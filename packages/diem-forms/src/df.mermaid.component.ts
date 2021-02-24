/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable class-methods-use-this */
import {
    Component,
    forwardRef,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    AfterViewInit,
    Input,
    ElementRef,
    ViewChild,
} from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import mermaidAPI from 'mermaid';

const MERMAIL_VALUE_ACCESSOR: any = {
    multi: true,
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MermaidComponent),
};

@Component({
    providers: [MERMAIL_VALUE_ACCESSOR],
    selector: 'df-mermaid',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<div #mermaidDiv [ngClass]="mmClass" [ngStyle]="mmStyle"></div>',
})
export class MermaidComponent implements AfterViewInit, ControlValueAccessor {
    @Input() public elementId: string = 'noop';
    @Input() public mmClass?: any;
    @Input() public mmStyle?: any;
    @Input() public value?: any;
    public env: Env;

    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @ViewChild('mermaidDiv') mermaidDiv: ElementRef | undefined;

    private cd: ChangeDetectorRef;

    public constructor(env: Env, cd: ChangeDetectorRef) {
        this.cd = cd;
        this.env = env;
    }

    public onTouch: () => {} = () => false;
    public onModelChange: (fn: any) => {} = () => false;

    public registerOnTouched: any = (fn: any) => {
        this.onTouch = fn;
    };
    public registerOnChange: any = (fn: any) => {
        this.onModelChange = fn;
    };

    public writeValue: any = (value: any) => {
        if (value) {
            this.value = value;
        }
    };

    public async ngAfterViewInit(): Promise<void> {
        mermaidAPI.initialize({
            theme: 'default',
            startOnLoad: false,
        });

        if (this.mermaidDiv) {
            const element: any = this.mermaidDiv.nativeElement;

            if (element && this.value) {
                console.info(`$home.main.component (renderMermaid): mermaid rendering for ${this.elementId}`);

                if (this.value.includes('mermaid')) {
                    const v = this.value.substring(this.value.indexOf('mermaid'), this.value.lastIndexOf('</div>'));
                    if (v) {
                        this.value = v.substring(v.indexOf('>') + 1, v.length);
                    }
                }

                mermaidAPI.render(`m_${this.elementId}`, this.value, (svgCode) => {
                    element.innerHTML = svgCode;
                });
            }

            this.check('here');
        }
    }

    private check = (from: string) => {
        console.info(`%c$df.form.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}

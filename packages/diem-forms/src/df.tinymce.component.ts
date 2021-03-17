/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable camelcase */
import { AfterViewInit, Component, EventEmitter, forwardRef, Input, OnDestroy, Output } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/*tslint:disable no-forward-ref*/
/*tslint:disable no-use-before-declare*/

declare let tinymce: any;

const EDITOR_VALUE_ACCESSOR: any = {
    multi: true,
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TinyEditorComponent),
};

@Component({
    providers: [EDITOR_VALUE_ACCESSOR],
    selector: 'df-tiny-editor',
    // eslint-disable-next-line @typescript-eslint/quotes
    template: `<textarea id="{{ elementId }}"></textarea>`,
})
export class TinyEditorComponent implements AfterViewInit, ControlValueAccessor, OnDestroy {
    @Input() public elementId?: string;
    @Output() public uploadClick: EventEmitter<any> = new EventEmitter();
    @Output() public tinyDrop: EventEmitter<any> = new EventEmitter();
    @Input() public files: File[] = [];
    @Input() public baseurl: string = 'tinymce';
    @Input() public theme: string = 'silver';
    @Input() public height: number = 250;

    public value: any;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    public content_style: string = `html, body {height: 100%; line-height: 1;} p {font-size: 1rem;line-height: 1.5;letter-spacing: 0;margin-top:0;margin-bottom:0} body#tinymce.drop {background:gray} body#tinymce.drop:before  {content: 'drop files here';position: absolute;color: #fff;font-size: 42px;top: 40%;left: 30%;}`;

    public editor: any;
    public editorContent?: string = undefined;

    public onTouch: () => {} = () => false;
    public onModelChange: (fn: any) => {} = () => false;

    public registerOnTouched: any = (fn: any) => {
        this.onTouch = fn;
    };
    public registerOnChange: any = (fn: any) => {
        this.onModelChange = fn;
    };

    public writeValue: any = (value: any) => {
        if (value && (typeof value === 'string' || value instanceof String)) {
            //* this.editorContent = value;
            if (this.editor) {
                this.editor.setContent(value, { format: 'raw' });
            } else {
                this.value = value;
            }
        }
    };

    public async ngAfterViewInit(): Promise<any> {
        await import('./df.tinymce.files')
            .then(() => {
                console.info('$df.tinymce (ngAfterViewInit) => tinymce loaded');

                tinymce.baseURL = this.baseurl;

                tinymce.init({
                    branding: false,
                    content_style: this.content_style,
                    content_css: `${this.baseurl}/skins/content/default/content.css`,
                    skin_url: `${this.baseurl}/skins/ui/oxide`,
                    contextmenu: 'link image imagetools table spellchecker',
                    height: this.height,
                    menubar: false,
                    min_height: 250,
                    paste_data_images: true,
                    plugins: ['link', 'paste', 'table', 'hr', 'paste', 'lists'],
                    relative_urls: false,
                    remove_script_host: false,
                    schema: 'html5',
                    selector: `#${this.elementId}`,
                    setup: (editor: any) => {
                        const addClass: () => void = () => {
                            const body: any = this.editor.getBody();
                            if (body) {
                                body.className = 'drop';
                            }
                        };

                        const removeClass: () => void = () => {
                            const body: any = this.editor.getBody();
                            if (body) {
                                body.className = 'mce-content-body';
                            }
                        };

                        const self: any = this;

                        this.editor = editor;

                        editor.on('keyup change', () => {
                            const tinyContent: any = editor.getContent();
                            this.onTouch();
                            this.onModelChange(tinyContent);
                            this.editorContent = tinyContent;
                        });

                        const emit: any = (): void => {
                            self.uploadClick.emit();
                        };

                        editor.ui.registry.addButton('clip', {
                            icon: 'upload',
                            onAction: emit,
                            tooltip: 'Upload File',
                        });

                        editor.on('init', () => {
                            const t: any = editor.getBody();

                            const stop: any = (e: Event) => {
                                e.stopPropagation();
                                e.preventDefault();
                            };

                            editor.dom.bind(t, 'dragenter dragover', (e: Event) => {
                                addClass();
                                stop(e);

                                return false;
                            });

                            editor.dom.bind(t, 'dragleave', (e: Event) => {
                                removeClass();
                                stop(e);

                                return false;
                            });

                            editor.dom.bind(t, 'drop', (e: Event) => {
                                removeClass();
                                stop(e);
                                this.tinyDrop.emit(e);
                            });
                        });
                    },
                    theme: this.theme,
                    toolbar: `undo redo | insert | styleselect | fontselect fontsizeselect | bold italic | forecolor | hr |
                    alignleft aligncenter alignright alignjustify | table | bullist numlist outdent indent | link`,
                    init_instance_callback: (editor: any) => {
                        if (this.value) {
                            editor.setContent(this.value, { format: 'raw' });
                        }
                    },
                });
            })
            .catch((err: Error) => console.error('$df.tinymce (ngAfterViewInit) => tinymce loaded', err.message));
    }

    public ngOnDestroy(): void {
        tinymce.remove(this.editor);
    }
}

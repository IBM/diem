import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { Env } from './env';

@Directive({ selector: '[ioIBMStickyHeader]' })
export class IBMStickyHeaderDirective implements OnInit {
    private a: number;
    private b: number;
    private c: boolean;
    private $el: any;
    private elementRef: ElementRef;
    private env: Env;
    private renderer: Renderer2;

    public constructor(elementRef: ElementRef, env: Env, renderer: Renderer2) {
        this.elementRef = elementRef;
        this.env = env;
        this.renderer = renderer;

        this.a = 0;
        this.$el = this.elementRef.nativeElement;
        this.b = this.$el.offsetHeight;
        this.c = false;
    }

    public ngOnInit(): void {
        this.renderer.listen('window', 'scroll', () => {
            this.handler();
        });
    }

    public handler(): void {
        this.a = document.documentElement ? document.documentElement.scrollTop : 0;
        const stickClass: string = 'ibm-sitenav-menu-sticky';
        if (this.a >= this.b) {
            if (this.c) {
                return;
            } else {
                const bodyClass: string = this.env.getField('bodyClass');

                if (bodyClass !== undefined && typeof bodyClass === 'string') {
                    this.env.setField('bodyClass', `${bodyClass}${stickClass}`);
                }
                this.c = true;
            }
        } else {
            this.c = false;

            const bodyClass: string = this.env.getField('bodyClass');

            if (bodyClass !== undefined && typeof bodyClass === 'string') {
                this.env.setField('bodyClass', bodyClass.replace(stickClass, ''));
            }
        }
    }
}

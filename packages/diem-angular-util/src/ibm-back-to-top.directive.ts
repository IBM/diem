/* eslint-disable @typescript-eslint/no-this-alias */
import { Directive, HostListener, OnInit } from '@angular/core';

@Directive({ selector: '[ioIBMBackToTop]' })
export class IBMBackToTopDirective implements OnInit {
    public isActive = false;
    public didScroll = false;
    public windowHeight: any = window.innerHeight;
    public buttonAppendTo: any;

    @HostListener('window:scroll', [])
    public onWindowScroll(): void {
        this.toggleBackToTop();
    }

    public ngOnInit(): void {
        const self: any = this;

        this.buttonAppendTo = document.getElementsByTagName('main')[0];
        const scroller: string =
            // eslint-disable-next-line max-len
            '<button class="ibm-btt-auto" id="backtotop" href="#top" tabindex="0"><i class="fas fa-angle-up fa-2x" style="color: #525252;"></i></button>';
        this.buttonAppendTo.insertAdjacentHTML('beforeend', scroller);

        const el: any = document.getElementById('backtotop');
        if (el) {
            el.addEventListener('click', (evt: any): void => {
                evt.preventDefault();
                self.TopscrollTo();
            });
        }
        self.TopscrollTo();
    }

    public TopscrollTo(): void {
        const self: any = this;
        if (window.scrollY !== 0) {
            setTimeout((): void => {
                self.TopscrollTo();
                window.scrollTo(0, window.scrollY - 30);
            }, 5);
        }
    }

    public toggleBackToTop(): void {
        if (window.scrollY > this.windowHeight && !this.isActive) {
            const el: any = document.getElementById('backtotop');
            if (el) {
                el.setAttribute('tabindex', '0');
            }
            const classes: HTMLCollectionOf<Element> = document.getElementsByClassName('ibm-btt-auto');
            if (classes && classes[0] && classes[0].classList) {
                classes[0].classList.add('active');
            }
            this.isActive = true;
        } else if (window.scrollY < this.windowHeight && this.isActive) {
            const el: any = document.getElementById('backtotop');
            if (el) {
                el.setAttribute('tabindex', '-1');
            }
            const classes: HTMLCollectionOf<Element> = document.getElementsByClassName('ibm-btt-auto');
            if (classes && classes[0] && classes[0].classList) {
                classes[0].classList.remove('active');
            }
            this.isActive = false;
        }
    }
}

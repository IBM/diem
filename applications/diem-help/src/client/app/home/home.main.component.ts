import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    AfterViewChecked,
} from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { catchError, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import mermaid from 'mermaid';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import import_index from '../../../../docs/index.json';
import { tmpl } from './templates/home.main.pug.tmpl';

interface Iitem {
    title?: string;
    name?: string;
    location?: string;
    section?: { title: string; items: Iitem[] };
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class HomeMainComponent implements OnInit, OnDestroy, AfterViewChecked {
    public index: any = import_index;
    public config: any = this.index.config;
    public items: Iitem[] = this.index.items;
    public header: any;

    public title: string;
    public env: Env;
    public doc_title: string = '<i class="fas fa-spinner fa-spin"></i>';
    public doc_content: SafeHtml = '';

    private loading: string = '<i class="fas fa-spinner fa-spin"></i>';
    private route: ActivatedRoute;
    private routeData!: Subscription; /** ! Will com later */

    private cd: ChangeDetectorRef;
    private http: HttpClient;

    private mermaid_pending: boolean = false;

    private sanitizer: DomSanitizer;

    public constructor(
        env: Env,
        http: HttpClient,
        route: ActivatedRoute,
        cd: ChangeDetectorRef,
        sanitizer: DomSanitizer
    ) {
        this.env = env;
        this.title = env.getField('title');
        this.http = http;
        this.route = route;
        this.cd = cd;
        this.sanitizer = sanitizer;

        mermaid.initialize({
            theme: 'default',
            startOnLoad: false,
        });
    }

    public ngOnInit(): void {
        this.doc_content = this.loading;
        this.routeData = this.route.data.subscribe((data: any) => {
            this.mermaid_pending = false;
            let id: string = 'about';
            if (data && data.params && data.params.id) {
                id = data.params.id;
            }
            this.getPage(id);
        });

        this.header = {
            background: `url(${this.config.background}) no-repeat scroll 0 0 /cover transparent`,
            'background-position': 'center',
        };
    }

    private getPage = (id: string) => {
        this.doc_content = this.loading;

        this.http
            .get(`./diem-help/user/convert/${id}`, { responseType: 'text' })
            .pipe(
                catchError(async (err: any) => {
                    console.info(`$home.main.component (getPage): loading error for => ${err.message}`);
                }),
                take(1)
            )
            .subscribe(async (res: any) => {
                const title: string | undefined = this.findDeep(this.items, id);
                this.doc_title = typeof title === 'string' ? title : 'no found';

                const safe_html: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(res);
                this.doc_content = safe_html;

                this.mermaid_pending = true;

                this.check('Route');
            });

        this.cd.markForCheck();
    };

    public ngAfterViewChecked(): void {
        if (this.mermaid_pending) {
            void this.renderMermaid();
            this.mermaid_pending = false;
        }
    }

    public renderMermaid = async (): Promise<void> => {
        const elements: any = document.getElementsByClassName('mermaid');

        if (elements && elements.length > 0) {
            console.info(`$home.main.component (renderMermaid): mermaid rendering for ${elements.length} elements`);
            let i: number = 0;
            for await (const element of elements) {
                mermaid.render(`graphDiv${i}`, element.innerText, (svgCode) => {
                    element.innerHTML = svgCode;
                });
                i++;
            }
        }

        return Promise.resolve();
    };

    /**
     * This code is the same as the backend code with the
     * difference that this is returning the title while
     * on the backend it's returning the location
     */
    private findDeep = (obj: Iitem[], name: string): string | undefined => {
        let location;
        for (const key in obj) {
            if (obj[key]) {
                const item: Iitem = obj[key];
                if (item && item.location && item.name === name) {
                    location = item.title;

                    break;
                } else if (item.section) {
                    location = this.findDeep(item.section.items, name);
                    if (location) {
                        break;
                    }

                    //
                }
            }
        }

        return location;
    };

    private check = (from: string) => {
        console.info(`%c$jobdetail.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };

    public ngOnDestroy(): void {
        if (this.routeData) {
            this.routeData.unsubscribe();
        }

        console.info('$jobdetail.component (ngOnDestroy): removing class: editmode');
    }
}

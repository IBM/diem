/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    ViewChild,
    HostListener,
    ChangeDetectorRef,
} from '@angular/core';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { menus, subMenus } from '../app.config';
import { appConfig } from './../app.config';
import { tmpl } from './templates/site.header.pug.tmpl';
import { SiteService } from './site.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'site-header',
    template: tmpl,
})
export class SiteHeaderComponent {
    @ViewChild('orgmenu') orgmenu!: ElementRef;

    public menus: any[] = [];
    public subMenus: any[] = [];
    public env: Env;
    public body: any;
    public siteName?: string = appConfig.sitename;
    public orgs: string[] = [];
    public userorg?: string;

    public infoPanel = false;
    public userPanel = false;
    public appPanel = false;

    public component?: string;

    public mexpanded = false;

    private httpService: HttpService;

    private SS: SiteService;
    private cd: ChangeDetectorRef;

    public constructor(env: Env, httpService: HttpService, SS: SiteService, cd: ChangeDetectorRef) {
        this.menus = menus;
        this.subMenus = subMenus;
        this.env = env;
        this.SS = SS;
        this.cd = cd;

        if (env.user && env.user.xorg) {
            const orgs: string[] = env.user.xorg.orgs;
            this.userorg = env.user.xorg.current.org;
            const idx: number = orgs.indexOf(this.userorg);
            orgs.splice(idx, 1);
            this.orgs = orgs;
        }

        this.httpService = httpService;

        this.SS.componentUpdate.subscribe((component) => {
            if (this.menus.some((menu: any) => menu.name === component)) {
                this.component = component;
                this.check('component change');
            }
        });
    }

    @HostListener('focusout', ['$event'])
    onFocusOut(event: MouseEvent): void {
        if (!event.relatedTarget) {
            this.closePanels();
        }
    }

    public evalStr: any = (str: string): any => Function(`"use strict";return (${str})`).call(this);

    public openPanel(panel: string, e: boolean): void {
        this.closePanels();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self: { [index: string]: any } = this;

        self[panel] = e;
    }

    public setOrg(org: string): void {
        this.updateSite(org);
    }

    private updateSite(org: string): void {
        this.httpService
            .httpPost(appConfig.profileurl, {
                org,
            })
            .subscribe({
                complete: () => {
                    console.info('$site.masthead.component (updateSite): reloading window....');
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                },
                error: (error: unknown) => {
                    if (typeof error === 'object') {
                        const err = error as Error;
                        console.warn('$site.masthead.component (updateSite): error', err);
                    }
                },
            });
    }

    private closePanels(): void {
        this.mexpanded = false;
        this.infoPanel = false;
        this.userPanel = false;
        this.appPanel = false;
    }

    private check = (from: string) => {
        console.info(`%c$site.header.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}

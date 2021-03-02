/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { menus, subMenus } from '../app.config';
import { appConfig } from './../app.config';
import { tmpl } from './templates/site.header.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-header',
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

    public infoPanel: boolean = false;
    public userPanel: boolean = false;
    public appPanel: boolean = false;

    public mexpanded: boolean = false;

    private httpService: HttpService;

    @HostListener('focusout', ['$event'])
    onFocusOut(event: MouseEvent): void {
        if (!event.relatedTarget) {
            this.closePanels();
        }
    }

    public constructor(env: Env, httpService: HttpService) {
        this.menus = menus;
        this.subMenus = subMenus;
        this.env = env;

        if (env.user && env.user.xorg) {
            const orgs: string[] = env.user.xorg.orgs;
            this.userorg = env.user.xorg.current.org;
            const idx: number = orgs.indexOf(this.userorg);
            orgs.splice(idx, 1);
            this.orgs = orgs;
        }

        this.httpService = httpService;
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
            .subscribe(
                () => {
                    console.info('$site.masthead.component (updateSite): reloading window....');
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                },
                (error: Error) => {
                    console.warn('$site.masthead.component (updateSite): error', error);
                }
            );
    }

    private closePanels(): void {
        this.mexpanded = false;
        this.infoPanel = false;
        this.userPanel = false;
        this.appPanel = false;
    }
}

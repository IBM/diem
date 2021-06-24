import { UrlSegment } from '@angular/router';

const fahome: string = 'fa fa-home';
const fausers: string = 'fa fa-users';

interface IAppConfig {
    [index: string]: string;
    app: string;
    appcookie: string;
    apppath: string;
    profileurl: string;
    sitename: string;
    slackurl: string;
}

const enum ERoutes {
    admin = 'admin',
    home = 'home',
    integrations = 'integrations',
    interactive = 'interactive',
    jobdetail = 'jobdetail',
    joblog = 'joblog',
    jobnew = 'jobnew',
    jobs = 'jobs',
    login = 'login',
    pathempty = 'pathempty',
    pathothers = 'pathothers',
    settings = 'settings',
}

interface IRouteModules {
    component: string;
    title: string;
    template: string;
    iconclass: string;
    access: number;
}

type IRoutes = {
    [route in ERoutes]: {
        component?: string;
        path: string;
        redirect?: string;
        data: {
            access: number;
            config?: any;
            titleicon?: string;
            title: string | false;
            paths?: string[];
            modules?: IRouteModules[];
        };
    };
};

export const appRoutes: IRoutes = {
    home: {
        data: {
            access: 1,
            title: 'Home',
        },
        path: '',
    },
    interactive: {
        component: 'interactive',
        data: {
            access: 1,
            title: 'Interactive',
        },
        path: 'interactive',
    },
    jobdetail: {
        component: 'jobdetail',
        data: {
            access: 1,
            title: 'Job Detail',
        },
        path: 'jobdetail/:id',
    },
    joblog: {
        component: 'joblog',
        data: {
            access: 1,
            title: 'Job Log',
        },
        path: 'joblog',
    },
    jobnew: {
        component: 'jobdetail',
        data: {
            access: 1,
            config: {
                locals: {
                    editmode: true,
                    readmode: false,
                },
                reset: true,
            },
            title: 'New Job',
        },
        path: 'jobdetail/new',
    },
    jobs: {
        component: 'jobs',
        data: {
            access: 1,
            title: 'All Jobs',
        },
        path: 'jobs',
    },
    login: {
        data: {
            access: 1,
            title: false,
        },
        path: 'login',
        redirect: '/auth/login',
    },
    pathempty: {
        data: {
            access: 1,
            title: false,
        },
        path: '',
        redirect: 'home',
    },
    pathothers: {
        data: {
            access: 1,
            title: false,
        },
        path: '**',
        redirect: 'home',
    },
    integrations: {
        component: 'integrations',
        data: {
            access: 1,
            title: 'Integrations',
            titleicon: 'fas fa-network-wired',
            paths: [
                'aboutintegrations',
                'connections',
                'webhooks',
                'configmaps',
                'webapikeys',
                'files',
                'tags',
                'snippets',
                'templates',
            ],
            modules: [
                {
                    component: 'aboutintegrations',
                    title: 'Overview',
                    template: 'aboutintegrations',
                    iconclass: fahome,
                    access: 1,
                },
                {
                    component: 'connections',
                    title: 'Connections',
                    template: 'connections',
                    iconclass: 'fas fa-link',
                    access: 40,
                },
                {
                    component: 'webhooks',
                    title: 'Webhooks',
                    template: 'webhooks',
                    iconclass: fausers,
                    access: 40,
                },
                {
                    component: 'webapikeys',
                    title: 'Api Keys',
                    template: 'webapikeys',
                    iconclass: 'fab fa-servicestack',
                    access: 40,
                },
                {
                    component: 'files',
                    title: 'Files',
                    template: 'files',
                    iconclass: 'fas fa-file-import',
                    access: 40,
                },
                {
                    component: 'configmaps',
                    title: 'Config Maps',
                    template: 'configmaps',
                    iconclass: 'fas fa-cogs',
                    access: 40,
                },
                { component: 'tags', title: 'Tags', template: 'tags', iconclass: 'fa fa-tags', access: 20 },
                {
                    component: 'templates',
                    title: 'Templates',
                    template: 'templates',
                    iconclass: 'fa fa-code',
                    access: 40,
                },
                {
                    component: 'snippets',
                    title: 'Code Snippets',
                    template: 'snippets',
                    iconclass: 'fas fa-file-code',
                    access: 40,
                },
            ],
        },
        path: 'integrations/:id',
    },
    settings: {
        component: 'settings',
        data: {
            access: 1,
            title: 'Settings',
            titleicon: 'fas fa-cogs',
            paths: ['aboutsettings', 'organization', 'organizations', 'profile', 'profiles'],
            modules: [
                // the order does matter, it will be desplayed on screen in the order below
                {
                    component: 'aboutsettings',
                    title: 'Overview',
                    template: 'aboutsettings',
                    iconclass: fahome,
                    access: 1,
                },
                {
                    component: 'organization',
                    title: 'Organization',
                    template: 'organization',
                    iconclass: 'fa fa-life-ring',
                    access: 1,
                },
                {
                    component: 'organizations',
                    title: 'Organizations',
                    template: 'organizations',
                    iconclass: 'fa fa-sitemap',
                    access: 40,
                },
                { component: 'profile', title: 'Profile', template: 'profile', iconclass: 'fa fa-user', access: 1 },
                {
                    component: 'profiles',
                    title: 'Profiles',
                    template: 'profiles',
                    iconclass: fausers,
                    access: 40,
                },
            ],
        },
        path: 'settings/:id',
    },
    admin: {
        component: 'admin',
        data: {
            access: 100,
            title: 'Admin',
            titleicon: 'fas fa-users-cog',
            paths: [
                'admin_about',
                'admin_organization',
                'admin_organizations',
                'admin_profile',
                'admin_profiles',
                'admin_tasks',
            ],
            modules: [
                // the order does matter, it will be desplayed on screen in the order below
                {
                    component: 'admin_about',
                    title: 'Overview',
                    template: 'aboutsettings',
                    iconclass: fahome,
                    access: 100,
                },
                {
                    component: 'admin_organization',
                    title: 'Organization',
                    template: 'organization',
                    iconclass: 'fa fa-life-ring',
                    access: 100,
                },
                {
                    component: 'admin_organizations',
                    title: 'Organizations',
                    template: 'organizations',
                    iconclass: 'fa fa-sitemap',
                    access: 100,
                },
                { component: 'profile', title: 'Profile', template: 'profile', iconclass: 'fa fa-user', access: 1 },
                {
                    component: 'admin_profiles',
                    title: 'Profiles',
                    template: 'profiles',
                    iconclass: fausers,
                    access: 100,
                },
                {
                    component: 'admin_tasks',
                    title: 'Tasks',
                    template: 'admin_tasks',
                    iconclass: 'fa fa-cog',
                    access: 100,
                },
            ],
        },
        path: 'admin/:id',
    },
};

export const modules: any = (): any =>
    Object.keys(appRoutes)
        .filter((key: any) => (appRoutes as any)[key].component)
        .reduce((acc: any, key: any) => ({ ...acc, [key]: (appRoutes as any)[key].component }), {});

export const appConfig: IAppConfig = {
    app: process.env && process.env.NAME ? process.env.NAME : '',
    appcookie: process.env && process.env.APPCOOKIE ? process.env.APPCOOKIE : 'dummy',
    apppath: process.env && process.env.APPPATH ? process.env.APPPATH : '',
    environment: process.env && process.env.ENVIRONMENT ? process.env.ENVIRONMENT : '',
    formsurl: 'etl-mgr/user/getFormQuestions?form=',
    imgurl: 'bluepages/img',
    profileurl: 'etl-mgr/user/updateprofile',
    sitename: process.env && process.env.SITENAME ? process.env.SITENAME : '',
    slackurl: 'etl-mgr/user/slackMsgError',
    version: process.env && process.env.VERSION ? process.env.VERSION : '',
};

export const menus: any[] = [
    {
        name: 'All jobs',
        value: ['/jobs'],
        visible: true,
    },
    {
        name: 'Integrations',
        value: ['/aboutintegrations'],
        visible: true,
    },
    {
        name: 'Job Log',
        value: ['/joblog/'],
        visible: true,
    },
    /*  {
        name: 'Interactive',
        value: ['/interactive'],
        visible: 'true',
    }, */
    {
        name: 'Settings',
        value: ['/aboutsettings'],
        visible: true,
    },
    {
        name: 'Admin',
        value: ['/admin_about'],
        visible: 'this.env.user.rolenbr === 100',
    },
];

export const subMenus: any[] = [
    {
        internal: false,
        name: 'Access Manager',
        value: '../access-mgr',
    },
    {
        internal: false,
        name: 'Admin Manager',
        value: '../admin-mgr',
    },
    {
        internal: true,
        name: 'Terms of Use',
        value: 'terms',
    },
    {
        internal: true,
        name: 'Support',
        value: 'help',
    },
];

export function matchSettings(url: UrlSegment[]): any {
    if (
        url.length > 0 &&
        appRoutes.settings.data.paths &&
        appRoutes.settings.data.paths.find((el) => url[0].path === el)
    ) {
        const component: UrlSegment = new UrlSegment(url[0].path, {});
        const id: UrlSegment | null = new UrlSegment(url[1] ? url[1].path : url[0].path, {}) || null;

        return {
            consumed: url,
            posParams: {
                component,
                id,
            },
        };
    }

    return null;
}

export function matchAdmin(url: UrlSegment[]): any {
    if (url.length > 0 && appRoutes.admin.data.paths && appRoutes.admin.data.paths.find((el) => url[0].path === el)) {
        const component: UrlSegment = new UrlSegment(url[0].path, {});
        const id: UrlSegment | null = new UrlSegment(url[1] ? url[1].path : url[0].path, {}) || null;

        return {
            consumed: url,
            posParams: {
                component,
                id,
            },
        };
    }

    return null;
}

export function matchIntegrations(url: UrlSegment[]): any {
    if (
        url.length > 0 &&
        appRoutes.integrations.data.paths &&
        appRoutes.integrations.data.paths.find((el) => url[0].path === el)
    ) {
        const component: UrlSegment = new UrlSegment(url[0].path, {});
        const id: UrlSegment | null = new UrlSegment(url[1] ? url[1].path : url[0].path, {}) || null;

        return {
            consumed: url,
            posParams: {
                component,
                id,
            },
        };
    }

    return null;
}

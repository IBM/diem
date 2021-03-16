/* eslint-disable no-underscore-dangle */
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { AppModule } from './app.module';
import { appConfig } from './app.config';

export const bootloader: any = (Main: any): void => {
    const _domReadyHandler: any = (): void => {
        document.removeEventListener('DOMContentLoaded', _domReadyHandler, false);
        Main();
    };

    switch (document.readyState) {
        case 'loading':
            document.addEventListener('DOMContentLoaded', _domReadyHandler, false);
            break;
        case 'interactive':
        case 'complete':
        default:
            Main();
    }
};

console.debug(
    `%c\uD83D\uDD06 Welcome to ${appConfig.sitename} on ${process.env.NODE_ENV} v.${appConfig.version} \u00A9IBM`,
    'font-family:cursive;font-size:18px;color: #4178be'
);
const nav: any = navigator;
if (nav.serviceWorker !== undefined) {
    nav.serviceWorker
        .register(`${appConfig.apppath}/service-worker.js`, { enabled: process.env.NODE_ENV })
        .then(() => {
            console.info('$main: Service Worker registered');
        })
        .catch((err: Error) => {
            console.info('$main: Service Worker registration failed: ', err);
        });
}
if (process.env.NODE_ENV === 'production') {
    enableProdMode();
}

export const main: any = (): any => platformBrowserDynamic().bootstrapModule(AppModule);

bootloader(main);

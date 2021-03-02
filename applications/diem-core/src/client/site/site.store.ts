import { Action } from '@ngrx/store';
import { IStoreMessageState } from '@mydiem/diem-forms';

export enum SiteStoreStatus {
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    INFO = 'INFO',
    WARN = 'WARN',
    HIDE = 'HIDE',
}

const initialState: IStoreMessageState = {
    detail: '',
    key: '',
    life: 2000,
    nostack: false,
    sticky: false,
    summary: 'Info !',
    type: '',
};

/**
 * Angular requires to export a function no fat arrow
 *
 * @param state The state
 * @param action The action
 */

export function SiteStore(state: any = initialState, action: Action): IStoreMessageState {
    const { type, detail, key, life, nostack, sticky, summary } = action as IStoreMessageState;

    switch (type) {
        case SiteStoreStatus.ERROR:
            return {
                ...state,
                detail,
                key: key || 'tr',
                nostack,
                severity: 'error',
                sticky,
                summary: summary || 'Error !',
            };
        case SiteStoreStatus.SUCCESS:
            return {
                ...state,
                detail,
                key: key || 'br',
                life: life || 1500,
                nostack,
                severity: 'success',
                sticky: sticky || false,
                summary: summary || 'Success !',
            };
        case SiteStoreStatus.WARN:
            return {
                ...state,
                detail,
                key: key || 'bl',
                life: life || 3000,
                nostack,
                severity: 'warning',
                sticky: sticky || false,
                summary: summary || 'Warning !',
            };
        case SiteStoreStatus.INFO:
            return {
                ...state,
                detail,
                key: key || 'bl',
                life: life || 3000,
                nostack,
                severity: 'info',
                sticky: sticky || false,
                summary: summary || 'Info !',
            };
        case SiteStoreStatus.HIDE:
            return {
                ...state,
                detail,
                key,
                severity: 'hide',
            };
        default:
            return state;
    }
}

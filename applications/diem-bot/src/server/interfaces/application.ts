export enum EComponents {
    service = 'service',
    jobs = 'jobs',
    announcement = 'announcement',
    approval = 'approval',
}

export interface IArgsBody {
    component: EComponents; // args[0]
    id: string | undefined; // args[1]
    params: {
        action: string | undefined; // args[1],{ [index: string]: any } | undefined; // args[3]
        component: EComponents;
        id: string | undefined;
        payload: { [index: string]: any } | string | undefined; // args[4]}
        event: { [index: string]: any } | string | undefined; // adding the event
    };
}

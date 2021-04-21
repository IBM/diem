export interface INatsPayload {
    inbox?: string;
    client: string;
    data?: any;
    sid?: number; // number used when the message has an id
    meta?: {
        cycle: number;
        size: number; // current size of the batch
        ts: number; // timestamp
        s_ts: number; // suggested timestamp
        acc_ts: number;
        acc_size: number;
    };
}

export interface INatsCredentials {
    clusterpassword: string;
    clustertoken?: string;
    clusteruser: string;
    ip: string;
    password?: string;
    token?: string;
    user?: string;
    seed?: string;
}

export interface INatsMessage {
    url: string;
    channel: string;
    client: string;
}

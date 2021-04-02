export interface INatsPayload {
    inbox?: string;
    client: string;
    data?: any;
    sid?: number; // number used when the message has an id
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

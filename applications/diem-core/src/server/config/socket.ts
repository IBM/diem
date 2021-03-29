import * as http from 'http';
import * as WebSocket from 'ws';
import { utils } from '@common/utils';
import { IntEnv } from '@interfaces';
import { slackMsg } from '@common/slack/slack';
import jwt from 'jsonwebtoken';
import { IClientPayload } from '../routes/models';
import { IntInteractivePayload } from '../routes/interactive/interactive';
import { pubSub } from './pubsub';

interface IWebSocket extends WebSocket {
    isAlive?: boolean;
    id?: string;
}

const noauth: string = 'HTTP/1.1 401 Unauthorized\r\n\r\n';

const arr: (rc: string) => any[] = (rc: string) => {
    const list: any = {};

    rc.split(';').forEach((cookie) => {
        const parts: any = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));

        return list;
    });

    return list;
};

export class Server {
    public pack: IntEnv;

    private wss!: WebSocket.Server;

    public constructor() {
        this.pack = utils.Env;
    }
    /**
     *
     *
     * @param {http.Server} server
     * @returns {Promise<any>}
     */
    public start = async (server: http.Server): Promise<any> => {
        /*
         * wss is the sebserver object
         */
        this.wss = new WebSocket.Server({ noServer: true });

        this.wss.on('error', (err) => {
            utils.logInfo(err);
        });

        this.wss.on('connection', (ws: IWebSocket) => {
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', (message: any) => {
                utils.logInfo(`new message from ${JSON.parse(message).email}`);
            });

            ws.on('error', async (err: any) => {
                err.caller = '$socket';
                await utils.logError('$socket (connection) error', err);
            });

            ws.on('close', async () => {
                utils.logInfo(`$socket (connection) closing - email: ${ws.id}`);
            });

            ws.send(pubSub.toString({ connected: true }));
        });

        const interval: NodeJS.Timeout = setInterval(() => {
            this.wss.clients.forEach((ws: any) => {
                if (ws.isAlive === false) {
                    utils.logInfo(`$socket (interval): checking sockets - removing: ${ws.id}`);

                    return ws.terminate();
                }

                ws.isAlive = false;

                ws.ping();
            });
            utils.logInfo(`$socket (start): ping - connected ${this.wss.clients.size}`);
        }, 30000);

        this.wss.on('close', () => {
            clearInterval(interval);
        });

        server.on('upgrade', async (request: http.IncomingMessage, socket, head) => {
            const headers: http.IncomingHttpHeaders = request.headers;
            let cookie: any;

            if (!headers.cookie) {
                utils.logInfo('$socket (upgrade): not authorized, no cookie');

                socket.write(noauth);

                return socket.destroy();
            }

            const cookies: any = arr(headers.cookie);
            if (cookies[utils.Env.appcookie]) {
                try {
                    cookie = jwt.decode(cookies[utils.Env.appcookie]);
                } catch (err) {
                    utils.logInfo('$socket (upgrade): not authorized, no valid userprofile');

                    socket.write(noauth);

                    return socket.destroy();
                }
            } else {
                // not needed
                // utils.logInfo('$socket (upgrade): not authorized, no valid cookie');

                socket.write(noauth);

                return socket.destroy();
            }

            this.wss.handleUpgrade(request, socket, head, (ws: any): boolean => {
                ws.id = cookie.email;
                ws.org = cookie.xorg?.current?.org;

                utils.logInfo(`$socket (upgrade): authorized with valid cookie - email: ${ws.id} - org: ${ws.org}`);

                ws.send(
                    pubSub.toString({
                        detail: `Hi ${cookie.name}, you have now a live connection.`,
                        title: 'Connected to ETL-MGR',
                    })
                );

                return this.wss.emit('connection', ws, request);
            });
        });

        utils.logInfo(`$socket (start-up): socket server started on port: ${process.env.port || 8443}`);
        const msg: string =
            `👷 $socket (start): ${this.pack.packname}@${this.pack.version}` +
            ` started up on ${this.pack.K8_SYSTEM_NAME} - pid: ${process.pid} (node ${process.version})`;
        utils.logInfo(msg);
        await slackMsg(msg);
    };

    /*
     * create an interface that contains an email and a serverpayload to be returned to front end
     * it's purpose is to sent a payload instead of message to the client
     */

    public bc: (msg: any) => void = async (msg: any) => {
        this.wss.clients.forEach(async (client: any) => {
            if (client.readyState === WebSocket.OPEN) {
                if (msg.org === client.org) {
                    client.send(pubSub.toString(msg));
                }
            } else {
                utils.logInfo('socket not ready', client.readyState);
            }
        });
    };

    /**
     * Sent a message to the client
     *
     * @param {Object} msg IClientPayload
     */
    public bcClient: (msg: IClientPayload) => void = async (msg: IClientPayload) => {
        if (msg && msg.clientEmail) {
            this.wss.clients.forEach((ws: any) => {
                if (ws.id === msg.clientEmail) {
                    ws.send(pubSub.toString({ ...msg.payload }));
                }
            });
        } else {
            utils.logInfo('$socket (message) cannot sent message as mo email');
        }
    };

    /* you can equally sent a message as email message*/
    /**
     *
     * @param {Object} msg { email: string; message: string }
     * @memberof Server
     */
    public message: (msg: { email: string; message: string }) => void = async (msg: {
        email: string;
        message: string;
    }) => {
        if (msg) {
            this.bcClient({
                clientEmail: msg.email,
                payload: msg.message,
            });
        }
    };

    public bcInteractive: (msg: IntInteractivePayload) => void = async (msg: IntInteractivePayload) => {
        if (msg && msg.email) {
            this.wss.clients.forEach((ws: any) => {
                if (ws.id === msg.email) {
                    ws.send(pubSub.toString({ ...msg.payload }));
                }
            });
        } else {
            utils.logInfo('$socket (bcInteractive) cannot sent message as mo email');
        }
    };
}

export const WSS: Server = new Server();

/* eslint-disable no-underscore-dangle */
import { cloudant } from './cloudant';
import { utils } from './utils';

class CoucheFunctions {
    public usersdb: any;

    public constructor() {
        this.usersdb = cloudant && cloudant.db ? cloudant.db.use('log_users') : undefined;
    }

    public updateUser = async (profile: any): Promise<any> =>
        new Promise((resolve) => {
            const updatedISO: string = utils.time();
            const updated: number = new Date().getTime();

            this.getDoc(profile.email)
                .then((doc: any) => {
                    this.insertdoc({
                        _id: profile.email,
                        // eslint-disable-next-line no-underscore-dangle
                        _rev: doc._rev,
                        history: this.history(doc.history, updatedISO),
                        profile,
                        updated,
                        updatedISO,
                    })
                        .then(() => resolve(true))
                        .catch(async (err: any) => {
                            err.caller = '$cloudant.functions (getDoc';

                            await utils.logError(`$cloudant.functions (updateUser): user: ${profile.email}`, err);
                            resolve(true);
                        });
                })
                .catch(() => {
                    this.insertdoc({
                        _id: profile.email,
                        created: updated,
                        createdISO: updatedISO,
                        history: [],
                        profile,
                        updated,
                        updatedISO,
                    })
                        .then(() => resolve(true))
                        .catch(async (err: any) => {
                            err.caller = '$cloudant.functions (insertdoc)';

                            await utils.logError(`$cloudant.functions (updateUser): user: ${profile.email}`, err);
                            resolve(true);
                        });
                });
        });

    public getDoc = async (id: string): Promise<any> =>
        new Promise((resolve, reject) => {
            this.usersdb
                .get(id)
                .then((body: any) => {
                    utils.logInfo(`$cloudant.functions (getDoc): found user: ${id}`);
                    resolve(body);
                })
                .catch((err: Error) => {
                    utils.logInfo(`$cloudant.functions (getdoc): new user: ${id}`);
                    reject(err);
                });
        });

    private insertdoc = async (body: any): Promise<any | string> =>
        new Promise((resolve, reject) => {
            this.usersdb
                .insert(body)
                .then(() => {
                    // eslint-disable-next-line no-underscore-dangle
                    utils.logInfo(`$cloudant.functions (insertdoc): user: ${body._id}`);
                    resolve(body.id);
                })
                .catch(async (err: any) => {
                    err.caller = '$cloudant.functions (insertdoc)';

                    await utils.logError(`$cloudant.functions (insertdoc): error for user: ${body._id}`, err);
                    reject(err.message);
                });
        });

    private history = (arr: any[], item: string): any[] => {
        if (Array.isArray(arr)) {
            arr.push(item);
            if (arr.length > 10) {
                return arr.slice(-1);
            }

            return arr;
        }

        return [item];
    };
}

// eslint-disable-next-line no-underscore-dangle
export const _couche: CoucheFunctions = new CoucheFunctions();

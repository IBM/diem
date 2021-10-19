/* eslint-disable class-methods-use-this */
/*jshint esversion: 8 */
import Operator from './operator';

class Watcher {
    public start = async () => {
        console.info('starting...');
        const operator = new Operator();

        await operator.Informer('', 'v1', 'pods');
    };
}

export const watcher: Watcher = new Watcher();

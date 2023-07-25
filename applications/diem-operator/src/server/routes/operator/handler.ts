/* eslint-disable class-methods-use-this */
/*jshint esversion: 8 */
import Operator from './operator';

class Watcher {
    public start = async () => {
        try {
            console.info('starting...');
            const operator = new Operator();

            void operator.Informer('', 'v1', 'pods');
        } catch (err) {
            console.error('$handler (Watcher', err);
        }
    };
}

export const watcher: Watcher = new Watcher();

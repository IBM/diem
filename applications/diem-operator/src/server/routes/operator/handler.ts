/*jshint esversion: 8 */
import Operator from './operator';

class Watcher {
    public start = async () => {
        console.info('starting...');
        const operator = new Operator();

        await operator.Informer('', 'v1', 'pods', 'default');
    };
}

export const watcher: Watcher = new Watcher();

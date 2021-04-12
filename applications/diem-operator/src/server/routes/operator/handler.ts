/*jshint esversion: 8 */
import Operator from './operator';

class Watcher {
    public start = async () => {
        console.info('starting...');
        const operator = new Operator();

        await operator.watchResource('', 'v1', 'pods', 'default');

        const exit = (reason: string) => {
            console.info(reason);
            operator.stop();
            process.exit(0);
        };

        process.on('SIGTERM', () => exit('SIGTERM')).on('SIGINT', () => exit('SIGINT'));
    };
}

export const watcher: Watcher = new Watcher();

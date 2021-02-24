import cluster from 'cluster';
import { cpus } from 'os';
const cpu: number = cpus().length;

const green: string = '\x1b[92m%s\x1b[0m';

process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, cpu * 1.5)).toString();
const msg: string = `$app (startup): running with threadpool ${process.env.UV_THREADPOOL_SIZE}`;
console.info(msg);

class StartCluster {
    private workers: cluster.Worker[] = [];

    public start = () => {
        cluster.setupMaster({
            exec: './server/server.js',
        });

        if (cluster.isMaster) {
            if (process.env.RUNLOCAL) {
                console.info('$sever-cluster: node env is local using 1 cpu');

                cluster.fork();
            } else {
                console.info(`$sever-cluster: starting up with ${cpu} cpu`);

                const timer: number = 250;

                for (let i: number = 0; i < cpu; i++) {
                    setTimeout(() => {
                        const worker: cluster.Worker = cluster.fork();

                        console.info(
                            green,
                            `$sever-cluster: starting worker: ${i} - id: ${worker.id} - pid: ${worker.process.pid}`
                        );

                        this.workers.push(worker);

                        worker.on('message', (message: any) => {
                            console.info(`$sever-cluster - message from worker - pid: ${worker.process.pid}`);

                            if (message.broadcast) {
                                this.sendMessage(message);
                            }
                        });

                        worker.send({ workernumber: i });
                    }, i * timer);
                }
            }

            cluster.on('exit', (worker: cluster.Worker, code: number, signal: string) => {
                console.info(
                    `$app.ts (cluster): worker ${worker.id} died - code: ${code} - signal: ${signal} - pid: ${worker.process.pid}`
                );
                cluster.fork();
            });
        }
    };

    private sendMessage = (message: any) => {
        this.workers.forEach((worker: cluster.Worker) => {
            worker.send(message);
        });
    };
}

export const server: StartCluster = new StartCluster();

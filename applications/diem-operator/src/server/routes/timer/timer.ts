import { setTimeout } from 'timers/promises';
import { publisher } from '@config/nats_publisher';

class Timer {
    public start = async () => {
        publisher.publish('publish', 'starting timer');
        await this.publish(0);
    };

    private publish = async (run: number) => {
        console.info(`$timer: publishing minute timer: ${run}`);
        publisher.publish('timer', {
            run,
        });

        if (run % 60 === 0) {
            publisher.publish('publish', `hourly timer confirmation - run: ${run}`);
        }

        await setTimeout(60000);
        run += 1;
        await this.publish(run);
    };
}

export const timer: Timer = new Timer();

import { setTimeout } from 'timers/promises';
import { publisher } from '@config/nats_publisher';

class Timer {
    public start = () => {
        void publisher.publish('publish', 'starting timer');
        void this.publish(0);
    };

    private publish = async (run: number) => {
        console.info(`$timer: publishing minute timer: ${run}`);
        void publisher.publish('timer', {
            run,
        });

        if (run % 60 === 0) {
            void publisher.publish('publish', `hourly timer confirmation - run: ${run}`);
        }

        await setTimeout(60000);
        run += 1;
        void this.publish(run);
    };
}

export const timer: Timer = new Timer();

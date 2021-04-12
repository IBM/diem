import { publisher } from '@config/nats_publisher';

class Timer {
    public start = () => {
        void publisher.publish('publish', 'starting timer');
        let run: number = 0;
        void this.publish(run);
        run += 1;
        setInterval(() => {
            void this.publish(run);
            run += 1;
        }, 60000);
    };

    private publish = async (run: number) => {
        console.info(`$timer: publishing minute timer: ${run}`);
        void publisher.publish('timer', {
            run,
        });

        if (run % 60 === 0) {
            void publisher.publish('publish', `hourly timer confirmation - run: ${run}`);
        }
    };
}

export const timer: Timer = new Timer();

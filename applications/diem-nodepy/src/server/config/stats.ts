import { workers } from '../routes/etl/etl.workers';

const memory = () => {
    const mem: NodeJS.MemoryUsage = process.memoryUsage();
    //actual memory used during the execution
    const heapUsed = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    //total size of the allocated heap
    const heapTotal = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;

    // Resident Set Size - total memory allocated for the process execution
    const rss = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    // V8 external memory
    const external = Math.round((mem.external / 1024 / 1024) * 100) / 100;

    const arrayBuffers = Math.round((mem.arrayBuffers / 1024 / 1024) * 100) / 100;

    console.info(
        // eslint-disable-next-line max-len
        `Hourly Stats: heapUsed ${heapUsed} MB - heapTotal: ${heapTotal} MB - rss: ${rss} MB - external: ${external} MB - arrayBuffers: ${arrayBuffers} MB -`
    );
    console.info(`Hourly Stats: number of workers ${Object.keys(workers).length}`);
};

export const stats = async () => {
    memory();

    setTimeout(() => {
        void stats();
    }, 60000);
};

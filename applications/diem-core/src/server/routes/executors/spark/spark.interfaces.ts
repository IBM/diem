import { IConnSchema, IJobConfig } from '@models';

export type ISrc = IConnSchema & IJobConfig['source'];
export type ITgt = IConnSchema & IJobConfig['target'];
export type ISrcPartition = NonNullable<ISrc['partition']>;

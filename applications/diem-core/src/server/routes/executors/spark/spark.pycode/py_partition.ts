import { ISrc } from '../spark.interfaces';
type ISrcPartition = NonNullable<ISrc['partition']>;

export const py_partition: (partition: ISrcPartition) => string = (partition: ISrcPartition) => String.raw`\
        .option("partitionColumn", "${partition.partitioncolumn || ''}")\
        .option("lowerBound", ${partition.lowerbound || 0})\
        .option("upperBound", ${partition.upperbound || 8})\
        .option("numPartitions", ${partition.numpartitions || 8})`;

export const py_session: (local: string) => string = (local: string) => String.raw`

### py_session ###

spark = SparkSession\
    .builder\
    .appName(config.__id)\
    .config("spark.debug.maxToStringFields", "100")${local}\
    .getOrCreate()

###__CODE__###`;

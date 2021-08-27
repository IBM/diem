export const py_opt_dropcolumns: (drop: string) => string = (drop: string) => String.raw`

### py_opt_dropcolumns (py_opt_dropcolumns) ###

df_tmp = df_src${drop}

df_tgt = df_tmp

msg = f"--- job {config.__id} finished dropping columns at {UtcNow()} --- running time: {time.time() - config.__starttime} ---"
out(msg)
print(msg)

###__CODE__###
`;

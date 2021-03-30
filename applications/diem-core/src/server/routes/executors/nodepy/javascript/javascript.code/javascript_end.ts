export const javascript_end: () => string = (): string => String.raw`
/* javascript_end */

msg = __\`Job __\${config.__id} finished - time: __\${UtcNow()} - running time: __\${(TimeNow() - config.__starttime).toFixed(3)} ms__\`

data = {
    status: "Completed",
    out: msg,
    jobend: UtcNow()
}
mq(data)

/* ###### */;`;

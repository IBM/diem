<!-- markdownlint-disable MD033 -->
# Paremeters for Connection -connections

> This describes the usuage of the parameters section in your job. For more details see the respective section.

```yaml
# Connections (Jobs)
# Connections can be used as follows
connections:
    - db2wh_etl
    - ssabl
    - progresql

using in your code: |
You can use the variables as follows:
# :  nameofconnection _ variable
1 directly as key replacement :db2wh_etl_username
2 or via access to the object like db2wh_etl['username']
```

Possible Values (Interface)

```typescript
export interface IConnSchema {
    _id: string;
    alias: string;
    annotations: IJobSchemaAnnotations;
    cert?: string;
    description: string;
    jdbc: string;
    owner: string;
    password: string;
    project: {
        org: string;
        orgscope: string;
    };
    idtype: 'personal' | 'functional';
    type: string;
    user: string;
    expires: Date;
}
```

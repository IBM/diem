# SQL Utilities

> A collection of some usefull db2 code snippets you can use for documentation and other items not documented well

## Tables

Listing tables

```sql
SELECT NAME,TYPE, COLCOUNT,REMARKS
FROM SYSIBM.SYSTABLES
WHERE CREATOR in ('ES') ORDER BY NAME,TYPE
```

For Use in MD format

```sql
SELECT NAME, '|',TYPE,  '|',COLCOUNT, '|',REMARKS
FROM SYSIBM.SYSTABLES WHERE CREATOR in ('ES') ORDER BY NAME,TYPE
```

If you want to add a comment on a table

```sql
COMMENT ON TABLE ES.ESW#REQ IS 'Main Request Table'
```

Make a list for adding comment by using a query

```sql
SELECT 'COMMENT ON TABLE '||trim(CREATOR)||'.'||NAME||' IS ' ||
CASE WHEN REMARKS IS NULL THEN ''''';' ELSE '''' || REMARKS || ''';' END
FROM SYSIBM.SYSTABLES WHERE CREATOR in ('ES') ORDER BY NAME,TYPE
```

## Columns

If you want to display the tables columns

```sql
SELECT
  NAME,
  COLTYPE,
  LENGTH,
  NULLS,
  KEYSEQ,
  REMARKS
FROM
  SYSIBM.SYSCOLUMNS
WHERE
  TBCREATOR='ES' AND
  TBNAME = 'ESW#REQ'
  ORDER BY COLNO;
```

If you want to display the tables columns for markdown

```sql
SELECT
  NAME,
  '|',
  COLTYPE,
  '|',
  LENGTH,
  '|',
  NULLS,
  '|',
  KEYSEQ,
  '|',
  REMARKS
FROM
  SYSIBM.SYSCOLUMNS
WHERE
  TBCREATOR='ES' AND
  TBNAME = 'ESW#CMR_SAP'
  ORDER BY COLNO;
```

If you want to add a comment on the field

```esw
COMMENT ON COLUMN ES.ESW#REQ.ID IS 'UNIQUE ID' ;
```

Make a list for adding comment by using a query

```sql
SELECT 'COMMENT ON COLUMN '||trim(TBCREATOR)||'.'||TBNAME||'.'|| NAME ||' IS '''';'
FROM
  SYSIBM.SYSCOLUMNS
WHERE
  TBCREATOR='ES' AND
  TBNAME = 'ESW#REQ'
  AND REMARKS IS null
  ORDER BY COLNO;
```

## Other Commands

### Foreign relationships

Get a list of foreing relationships

```sql
select substr(tabname,1,20) table_name,substr(constname,1,20)
fk_name,substr(REFTABNAME,1,12) parent_table,substr(refkeyname,1,20)
pk_orig_table,fk_colnames from syscat.references where tabname =
```

### Cross References

```sql
select substr(tabname,1,20) table_name,substr(constname,1,20)
fk_name,substr(REFTABNAME,1,12) parent_table,substr(refkeyname,1,20)
pk_orig_table,fk_colnames from syscat.references where tabname =
```

### Reorg Statement

!!! failure "*SQL Error [57016]: Operation not allowed for reason code '7'*"

```sql
CALL SYSPROC.ADMIN_CMD('reorg table es.esw#act_info')
```

### Tables in Pending state

```sql
select TABSCHEMA, TABNAME from SYSIBMADM.ADMINTABINFO where REORG_PENDING = 'Y'
```

### Integrity

!!! failure "SQL0668N Operation not allowed for reason code "1" on table 'TSMDB1.AAA'"

```sql
set integrity for ES.ESW#REQ_M immediate checked not incremental
```

### Null Values

!!! failure "SSQL0407N Assignment of a NULL value to a NOT NULL column 'TBSPACEID=2,TABLEID=10, COLNO=11' is not allowed"

```sql
SELECT tabschema, tabname, colname
FROM syscat.columns
WHERE colno = 2 AND ( tabschema, tabname ) IN
( SELECT tabschema, tabname
FROM syscat.tables WHERE tbspaceid = 2 AND tableid = 3611 )
```

### Constraints

set a constraint

```sql
ALTER TABLE EMPLOYEE
      ADD CONSTRAINT NEWID UNIQUE(EMPNO,HIREDATE)
```

### Reorg

```sql
CALL SYSPROC.ADMIN_CMD('reorg table es.esw#act_info');
```

### Runstats

```sql
CALL SYSPROC.ADMIN_CMD('runstats on table staging.FCT_MRR_ARR_SUM_V2_ICN WITH DISTRIBUTION');
```

### Annotations

Example 1:  Add a comment for the EMPLOYEE table.

```sql
COMMENT ON TABLE EMPLOYEE IS 'Reflects first quarter reorganization'
```

Example 2:  Add a comment for the EMP_VIEW1 view.

```sql
   COMMENT ON TABLE EMP_VIEW1
     IS 'View of the EMPLOYEE table without salary information'copy to clipboard
```

Example 3:  Add a comment for the EDLEVEL column of the EMPLOYEE table.

```sql
   COMMENT ON COLUMN EMPLOYEE.EDLEVEL
     IS 'highest grade level passed in school'copy to clipboard
```

Example 4:  Add comments for two different columns of the EMPLOYEE table.

```sql
   COMMENT ON EMPLOYEE
     (WORKDEPT IS 'see DEPARTMENT table for names',
     EDLEVEL IS 'highest grade level passed in school' )
```

### Get Indexes

```sql
SELECT tabname,indname,colnames,indschema,lastused,owner
FROM SYSCAT.indexes WHERE tabschema = 'ES'
ORDER BY 1,2
```

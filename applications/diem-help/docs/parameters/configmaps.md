<!-- markdownlint-disable MD033 -->
# Parameters for Config Maps -configmaps

> This describes the usage of the parameters section in your job. For more details see the respective section.

```yml
# Config Maps (Jobs)
# You can use the values of configmaps in your job
# Create them in the config map section in settings
# Reference them with the selector
configmaps:
    - globals
    - apiserver
    - adminmgr

using in your code: |
You can use the variables as follows:
1 directly as key replacement :adminmgr_x-api-key
2 or via access to the object like adminmgr['x-api-key']
```

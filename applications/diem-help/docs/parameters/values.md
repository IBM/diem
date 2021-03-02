<!-- markdownlint-disable MD033 -->
# Parameters for custom Values -values

> You can add custom values to the parameters section that you can then use in your code or job

## Raw values (values)

Custom Values can be used as paramaters in a custom job

```yml
# Value Pairs (jobs)
# Value pairs are simple keyword replacements
# When using in sql make sure they are appropriately quotes and or enclosed
values:
    glaccounts_str: ( '3572100', '3620300', '3620301', '3620302',
        '3620305','3620600', '3620306', '3620307' )
    glaccounts:
        - 3572100
        - 3620300
        - 3620301
        - 3620302
    div: (2,3,4)
    database: cloud0.revenue
    about: This is a test
    python: "True"
```

## Using values in your code with the :notation

```sql
select * from :database where code in :glaccounts_str
```

```python
print(':about!')
```

<ibm-notification id="notification-0" class="bx--inline-notification bx--inline-notification--warning" role="alert">
<div class="bx--inline-notification__text-wrapper">
<i class="fas fa-exclamation-circle c-yellow mgl-10 mgr-5 fa-2x"></i>
<span>When doing text replace in custom code don't forget to enquote your value if needed</span>
</div></ibm-notification>

## Using the values Object

When adding values an object will be added to your code as a Dictionary

```py
### Values obj ###
values = {
    "glaccounts_str":"( '3572100', '3620300', '3620301', '3620302', '3620305','3620600', '3620306', '3620307' )",
    "glaccounts":[3572100,3620300,3620301,3620302],
    "div":"(2,3,4)",
    "database":
    "cloud0.revenue",
    "about":"This is a test",
    "python":"True"
    }
### custom ###
```

example usuage in your code

```py
txt = ""
for pl in values["glaccounts"]:
    txt += f"this is account nbr: {pl}<br/>"
out(txt)
```

```html
cloud0.revenue
this is account nbr: 3572100
this is account nbr: 3620300
this is account nbr: 3620301
this is account nbr: 3620302
```
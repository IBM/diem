<!-- markdownlint-disable MD033 -->
# Markdown

> When you want to contribuate to the documentation of DIEM, here are some code elements you can use

## Markdown plugings

### Images

How to embed an image and set it's size

``` markdown
![url4](../../../diem-help/docs/images/jobtypes/url4.png =600x)
=600x200  500 width 200 height
=x300 only height
=220x only width
```

### Mermaid

header used

```html
%%{init: {'themeVariables': { 'fontSize': '12px'}}}%%
graph LR;linkStyle default interpolate basis;
```

## Carbon html

You can include HTML

Add the following to the header of your page in case you want to include html

``` markdown
<!-- markdownlint-disable MD033 -->
```

``` html
<ibm-notification id="notification-0" class="bx--inline-notification bx--inline-notification--error" role="alert">
<div class="bx--inline-notification__text-wrapper">
<i class="fas fa-exclamation-circle c-red mgl-10 mgr-5 fa-2x"></i>
<span>Sample error message</span>
</div></ibm-notification>
```

<ibm-notification id="notification-0" class="bx--inline-notification bx--inline-notification--error" role="alert">
<div class="bx--inline-notification__text-wrapper">
<i class="fas fa-exclamation-circle c-red mgl-10 mgr-5 fa-2x"></i>
<span>Sample error message</span>
</div></ibm-notification>

``` html
<ibm-notification id="notification-0" class="bx--inline-notification bx--inline-notification--error" role="alert">
<div class="bx--inline-notification__text-wrapper">
<i class="fas fa-exclamation-circle c-red mgl-10 mgr-5 fa-2x"></i>
<span>Sample error message</span>
</div></ibm-notification>
```

<ibm-notification id="notification-0" class="bx--inline-notification bx--inline-notification--warning" role="alert">
<div class="bx--inline-notification__text-wrapper">
<i class="fas fa-exclamation-circle c-yellow mgl-10 mgr-5 fa-2x"></i>
<span>This is a warning Message</span>
</div></ibm-notification>

### Font Awasome

You can include [font-awasome](https://fontawesome.com/) in your markdown

```html
<i class="fas fa-info fa-3x c-red mgr-5"></i><span>This is a test</span>
```

<i class="fas fa-info fa-3x c-red mgr-5"></i><span>This is a test</span>

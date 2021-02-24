Angular AOT Fixer : PUG
=======================

This package tries to fix the ng2 AOT compiler behaviour that expect the template of a `@Component` to be a string.

ngc works fine if the `template` metadata is defined for a @Component but when you want to use `.pug` files for your templates
it fails.

```
import { tpl } from "./this-component.pug";

@Component({
  template: tpl
})
```

This would fail since typescript has no knowledge of how to handle pug files:
```
❯ node_modules/.bin/ngc -p .
TypeError: this._input.charCodeAt is not a function
    at _Tokenizer._advance (/Users/me/dev/angular-2-seed/node_modules/@angular/compiler/bundles/compiler.umd.js:4980:73)
    at new _Tokenizer (/Users/me/dev/angular-2-seed/node_modules/@angular/compiler/bundles/compiler.umd.js:4864:16)
```

This package generates a `.ts` file for every pug file present that will contain the pure HTML as parsed by pug. 
It must be run before doing a `ngc` build.
The compiler will then be able to resolve the `.pug` import as a string (The content is exposed as a export named `tpl`!)

In the above example a file called `./this-component.pug.ts` will be generated. 
You may safely add `*.pug.ts` files to your `.gitignore` since you'll only need them for the AOT compiler run.

Usage:
------
```
node_modules/.bin/ng2-aot-fixer-pug --src-path src
```

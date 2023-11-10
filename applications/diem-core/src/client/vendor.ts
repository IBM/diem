import 'zone.js';

/*
to solve the error  TypeError: Object doesn't support property or method 'matches' ",
https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
*/

export interface IElement extends Element {
    msMatchesSelector(selectors: string): boolean;
}

if (Element && !Element.prototype.matches) {
    (Element.prototype as IElement).matches = (Element.prototype as IElement).msMatchesSelector;
}

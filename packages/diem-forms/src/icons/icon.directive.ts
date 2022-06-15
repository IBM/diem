/* eslint-disable @typescript-eslint/prefer-for-of */
import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';
import { getAttributes } from '@carbon/icon-helpers';
import { AppIconService } from './icon.service';

@Directive({
    selector: '[appIcon]',
})
export class AppIconDirective implements AfterViewInit {
    private static titleIdCounter = 0;
    @Input() public appIcon = '';
    @Input() public size = '16';
    @Input() public title = '';
    @Input() public ariaLabel = '';
    @Input() public ariaLabelledBy = '';
    @Input() public ariaHidden = '';
    @Input() public isFocusable = false;

    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    public constructor(protected elementRef: ElementRef, protected iconService: AppIconService) {}

    public ngAfterViewInit() {
        const root = this.elementRef.nativeElement as HTMLElement;

        let icon;
        try {
            icon = this.iconService.get(this.appIcon, this.size.toString());
        } catch (error) {
            console.warn(error);

            // bail out
            return;
        }

        const domParser = new DOMParser();
        const rawSVG = icon.svg || 'help';
        const svgElement = domParser.parseFromString(rawSVG, 'image/svg+xml').documentElement;

        let node: ChildNode | null = root.tagName.toUpperCase() !== 'SVG' ? svgElement : svgElement.firstChild;
        while (node) {
            // importNode makes a clone of the node
            // this ensures we keep looping over the nodes in the parsed document
            root.appendChild(root.ownerDocument.importNode(node, true));
            // type the node because the angular compiler freaks out if it
            // ends up thinking it's a `Node` instead of a `ChildNode`
            node = node.nextSibling as ChildNode;
        }

        const svg = root.tagName.toUpperCase() !== 'SVG' ? svgElement : root;
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const others: any = {
            'aria-label': this.ariaLabel,
            'aria-labelledby': this.ariaLabelledBy,
            'aria-hidden': this.ariaHidden,
            focusable: this.isFocusable.toString(),
        };

        const attributes: { [index: string]: any } = getAttributes({
            width: Number(icon.attrs.width),
            height: Number(icon.attrs.height),
            viewBox: icon.attrs.viewBox,
            title: this.title,
            ...others,
        });

        const attrKeys = Object.keys(attributes);
        for (let i = 0; i < attrKeys.length; i++) {
            const key = attrKeys[i];
            const value = attributes[key];

            if (key === 'title') {
                continue;
            }

            if (value) {
                svg.setAttribute(key, value);
            }
        }

        if (attributes.title) {
            const title = document.createElement('title');
            title.textContent = attributes.title;
            AppIconDirective.titleIdCounter++;
            title.setAttribute('id', `${icon.name}-title-${AppIconDirective.titleIdCounter}`);
            // title must be first for screen readers
            svg.insertBefore(title, svg.firstElementChild);
            svg.setAttribute('aria-labelledby', `${icon.name}-title-${AppIconDirective.titleIdCounter}`);
        }
    }
}

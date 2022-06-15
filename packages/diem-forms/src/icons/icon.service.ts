/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-classes-per-file */
import { Injectable } from '@angular/core';
import { toString } from '@carbon/icon-helpers';

/**
 * An object that represents a parsed icon
 */
export interface IconDescriptor {
    /**
     * The element to render. For the root this is `svg`
     */
    elem: string;
    /**
     * An object of attributes to apply to the element.
     *
     * The type here is non-exhaustive.
     */
    attrs: {
        [x: string]: string;
        xmlns: string;
        // needed by the icon directive to determine other attributes
        viewBox: string;
        fill: string;
        // needed by the icon directive to determine other attributes
        width: string;
        // needed by the icon directive to determine other attributes
        height: string;
    };
    /**
     * The content (children) of the element as an array of `IconDescriptor`s
     * (usually without a few fields, namely `name` and `size`)
     */
    content: IconDescriptor[];
    /**
     * The name of the icon.
     *
     * Needed by the icon service.
     */
    name: string;
    /**
     * The size of the icon in pixels.
     *
     * Needed by the icon service.
     */
    size: number;
    /**
     * Optional. A string representation of the compiled svg.
     * If missing the icon service will add this.
     */
    svg?: string;
}

/**
 * Abstract class that represent a cache of icons.
 *
 * The actual caching mechanism will be implementation specific,
 * but it's likely a good idea to key by the icons name and/or size.
 * Icon name and size will always be strings, and they will be the two consistent
 * identifiers of an icon. For the purposes of storage additonal descriptor properties may
 * be used, but the name and size are the only ones guarenteed to be passed for lookup purposes.
 */
export abstract class IconCache {
    /**
     * Finds and returns an icon based on it's name and size
     */
    public abstract get(name: string, size: string): object | undefined;
    /**
     * stores an icon descriptor to the cache
     */
    public abstract set(name: string, size: string, descriptor: object): void;
}

/**
 * Custom error for when a name can't be found
 */
export class IconNameNotFoundError extends Error {
    public constructor(name: string) {
        super(`Icon ${name} not found`);
    }
}

/**
 * Custom error for when a specific size can't be found
 */
export class IconSizeNotFoundError extends Error {
    public constructor(size: string, name: string) {
        super(`Size ${size} for ${name} not found`);
    }
}

/**
 * Concrete implementation of `IconCache` as a simple in memory cache
 */
export class IconMemoryCache extends IconCache {
    private iconMap = new Map<string, Map<string, object>>();

    public get(name: string, size: string) {
        if (!this.iconMap.has(name)) {
            throw new IconNameNotFoundError(name);
        }
        const sizeMap = this.iconMap.get(name);
        if (!sizeMap?.has(size)) {
            throw new IconSizeNotFoundError(size, name);
        }

        return sizeMap.get(size);
    }

    public set(name: string, size: string, descriptor: object) {
        if (!this.iconMap.has(name)) {
            this.iconMap.set(name, new Map());
        }
        const sizeMap = this.iconMap.get(name);
        if (sizeMap) {
            sizeMap.set(size, descriptor);
        }
    }
}

@Injectable()
export class AppIconService {
    private iconCache: IconCache = new IconMemoryCache();

    /**
     * Registers an array of icons based on the metadata provided by `@carbon/cions`
     */
    public registerAll(descriptors: object[]) {
        descriptors.forEach((icon) => this.register(icon));
    }

    /**
     * Registers an icon based on the metadata provided by `@carbon/icons`
     */
    public register(descriptor: object) {
        const { name } = descriptor as IconDescriptor;
        this.registerAs(name, descriptor);
    }

    /**
     * Registers an icon based on a uniqe name and metadata provided by `@carbon/icons`
     */
    public registerAs(name: string, descriptor: object) {
        const { size } = descriptor as IconDescriptor;
        this.iconCache.set(name, size.toString(), descriptor);
    }

    /**
     * Gets an icon, converts it to a string, and caches the result
     */
    public get(name: string, size: string): IconDescriptor {
        try {
            const icon = this.iconCache.get(name, size.toString()) as IconDescriptor;
            if (!icon.svg) {
                icon.svg = toString(icon);
            }

            return icon;
            // eslint-disable-next-line sonarjs/no-useless-catch
        } catch (e) {
            throw e;
        }
    }

    /**
     * Configure various service settings (caching strategy ...)
     */
    public configure(options: { cache: IconCache }) {
        this.iconCache = options.cache;
    }
}

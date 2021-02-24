import { Pipe, PipeTransform } from '@angular/core';

/** I don't we need this anymore */

@Pipe({
    name: 'dfObj2Array',
})
export class Object2Array implements PipeTransform {
    public transform: any = (value: any): any => {
        const keys: any[] = [];
        for (const file in value) {
            if (Object.prototype.hasOwnProperty.call(value, file)) {
                keys.push({
                    ...value[file],
                    file,
                });
            }
        }

        return keys;
    };
}

import { Injectable } from '@angular/core';
import { WindowName } from '@app/config';
import { OWWindow } from '@app/odk';
import { OWUtils } from '@app/odk/ow-utils';
import { of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

const WIN_WIDTH = 278;
const WIN_HEIGHT = 348;

@Injectable({
    providedIn: 'root'
})
export class LauncherWindowService {
    private readonly window: OWWindow;

    constructor() {
        this.window = new OWWindow(WindowName.Launcher);
    }

    public open(): void {
        OWUtils.getSystemInformation().pipe(
            map(info => info.Monitors.find(x => x.IsMain)),
            flatMap(monitor => this.window.restore().pipe(
                flatMap(() => {
                    if (monitor) {
                        const [x, y] = monitor.Location.split(',').map(loc => +loc.trim());
                        const [width, height] = monitor.Resolution.split(',').map(res => +res.trim());
                        console.log('monitor', x, y, width, height);

                        const left = x + (width / 2) - (WIN_WIDTH / 2);
                        const top = y + (height / 2) - (WIN_HEIGHT / 2);
                        if (!isNaN(left) && !isNaN(top)) {
                            return this.window.changePosition(left, top);
                        }
                    }
                    return of(null);
                }),
            ))
        ).subscribe();
    }

    public close(): void {
        this.window.close().subscribe();
    }
}

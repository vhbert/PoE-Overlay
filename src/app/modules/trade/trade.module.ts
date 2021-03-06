import { NgModule, NgZone } from '@angular/core';
import { AnnotationService } from '@app/annotation';
import { Feature, FeatureConfig, FeatureModule, FEATURE_MODULES } from '@app/feature';
import { RunningGameInfo } from '@app/odk';
import { EventService } from '@shared/module/poe/event';
import { TradeItemMessage, TradeParserType, TradeWhisperDirection } from '@shared/module/poe/trade/chat';
import { SharedModule } from '@shared/shared.module';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TradeMessageActionComponent, TradeMessageBulkComponent, TradeMessageComponent, TradeMessageDirectionComponent, TradeMessageItemComponent, TradeMessageMapComponent, TradeMessageMapTierComponent, TradeSettingsComponent } from './component';
import { TradeHighlightWindowService, TradeService, TradeWindowService } from './service';
import { TradeFeatureSettings } from './trade-feature-settings';
import { TradeHighlightWindowComponent, TradeWindowComponent } from './window';

const WINDOWS = [
    TradeWindowComponent,
    TradeHighlightWindowComponent
];

@NgModule({
    providers: [{ provide: FEATURE_MODULES, useClass: TradeModule, multi: true }],
    declarations: [
        ...WINDOWS,
        TradeSettingsComponent,
        TradeMessageComponent,
        TradeMessageItemComponent,
        TradeMessageMapComponent,
        TradeMessageBulkComponent,
        TradeMessageActionComponent,
        TradeMessageDirectionComponent,
        TradeMessageMapTierComponent,
    ],
    exports: [...WINDOWS],
    imports: [SharedModule]
})
export class TradeModule implements FeatureModule<TradeFeatureSettings> {
    private enabled = false;

    constructor(
        private readonly event: EventService,
        private readonly trade: TradeService,
        private readonly tradeWindow: TradeWindowService,
        private readonly highlightWindow: TradeHighlightWindowService,
        private readonly annotation: AnnotationService,
        private readonly ngZone: NgZone, ) { }

    public getConfig(): FeatureConfig<TradeFeatureSettings> {
        const config: FeatureConfig<TradeFeatureSettings> = {
            name: 'trade.name',
            component: TradeSettingsComponent,
            default: {
                tradeEnabled: true,
                tradeMessageWait: 'Currently in @zone. Do you want to wait until finished?',
                tradeMessageStillInterested: 'Do you still want @itemname for @price?',
                tradeMessageItemGone: 'Sorry, @itemname already gone. Good luck on your search.',
                tradeMessageThanks: 'Thank you for the trade. Have a nice day and good luck.',
                tradeStashFactor: {},
                tradeWindowPinned: false,
                tradeSoundEnabled: true,
                tradeSoundVolume: 75
            }
        };
        return config;
    }

    public getFeatures(): Feature[] {
        const features: Feature[] = [];
        return features;
    }

    public onSettingsChange(settings: TradeFeatureSettings): void {
        if (settings.tradeEnabled) {
            this.tradeWindow.restore(settings).subscribe();
        } else {
            this.tradeWindow.close().subscribe();
            this.highlightWindow.close().subscribe();
            this.trade.clear();
        }
        this.enabled = settings.tradeEnabled;
    }

    public onInfo(info: RunningGameInfo, settings: TradeFeatureSettings): void {
        const { isRunning } = info;
        if (isRunning) {
            if (settings.tradeEnabled) {
                this.tradeWindow.restore(settings).subscribe();
                this.registerAnnotation();
            }
        } else {
            this.tradeWindow.close().subscribe();
            this.highlightWindow.close().subscribe();
            this.trade.clear();
        }
        this.enabled = settings.tradeEnabled;
    }

    public onLogLineAdd(line: string): void {
        if (this.enabled) {
            this.trade.onLogLineAdd(line);
        }
    }

    private registerAnnotation(): void {
        let lastId = '';
        this.annotation.message$.on(message => this.ngZone.run(() => {
            const id = message?.id || '';
            if (id === lastId) {
                return;
            }
            lastId = id;

            switch (id) {
                case 'trade.outgoing':
                case 'trade.incoming':
                    this.event.getCharacter().pipe(
                        catchError(() => of(null))
                    ).subscribe(character => {
                        const item: TradeItemMessage = {
                            direction: id === 'trade.outgoing'
                                ? TradeWhisperDirection.Outgoing
                                : TradeWhisperDirection.Incoming,
                            itemName: 'Apocalypse Horn Decimation Bow',
                            joined$: new BehaviorSubject(false),
                            league: 'Standard',
                            left: 4,
                            top: 6,
                            // tslint:disable:max-line-length
                            message: 'Hi, I would like to buy your Apocalypse Horn Decimation Bow for 2 chaos in Delirium (stash tab "Annotation"; position: left 4, top 6)',
                            // tslint:enable:max-line-length
                            name: character?.name || 'PoEOverlayUnknownCharacter',
                            stash: 'Annotation',
                            timeReceived: new Date(),
                            type: TradeParserType.TradeItem,
                            whispers$: new BehaviorSubject([]),
                            currencyType: 'chaos',
                            price: 2
                        };
                        this.trade.set(item);
                    });
                    break;
                case 'trade.settings':
                    this.highlightWindow.close().subscribe();
                    this.trade.clear();
                    break;
            }
        }));
    }
}

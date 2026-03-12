import { Injectable, signal } from '@angular/core';

export type AppView = 'messages' | 'friends' | 'newFeeds';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    activeView = signal<AppView>('messages');

    setView(view: AppView) {
        this.activeView.set(view);
    }
}

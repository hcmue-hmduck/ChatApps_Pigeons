import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveConversationService } from './activeConversation.service';

export type AppView = 'messages' | 'friends' | 'newFeeds';
export type FriendsTab = 'friends' | 'friend_requests' | 'blocked' | 'sent_requests' | 'friends_suggestions';

export interface DirectConversationTarget {
    id: string;
    full_name?: string;
    avatar_url?: string;
    last_online_at?: string | Date;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
    router = inject(Router);
    convStore = inject(ActiveConversationService);
    activeView = signal<AppView>('messages');
    activeFriendsTab = signal<FriendsTab>('friends_suggestions');
    pendingConversationId = signal<string | null>(null);
    pendingDirectConversationUser = signal<DirectConversationTarget | null>(null);

    constructor() {
        // Restore persisted active view if available
        try {
            const saved = localStorage.getItem('pigeons_active_view');
            if (saved === 'messages' || saved === 'friends' || saved === 'newFeeds') {
                this.activeView.set(saved as AppView);
            }
        } catch (e) {
            // ignore
        }

        // Listen to router navigation to keep activeView in sync with URL (handles reloads)
        this.router.events.subscribe((ev: any) => {
            const NavigationEnd = (ev && ev.constructor && ev.constructor.name === 'NavigationEnd');
            if (!NavigationEnd) return;
            const url: string = ev.urlAfterRedirects || ev.url || '';
            if (url.startsWith('/relationship')) {
                this.activeView.set('friends');
                try { localStorage.setItem('pigeons_active_view', 'friends'); } catch {};
            } else if (url.startsWith('/new-feeds')) {
                this.activeView.set('newFeeds');
                try { localStorage.setItem('pigeons_active_view', 'newFeeds'); } catch {};
            } else {
                this.activeView.set('messages');
                try { localStorage.setItem('pigeons_active_view', 'messages'); } catch {};
            }
        });
    }

    setView(view: AppView) {
        this.activeView.set(view);
        try { localStorage.setItem('pigeons_active_view', view); } catch {}
        if (view === 'messages') {
            this.router.navigate(['/conversations']);
        } else if (view === 'friends') {
            this.router.navigate(['/relationship']);
        } else if (view === 'newFeeds') {
            this.router.navigate(['/new-feeds']);
        }
    }

    setFriendsTab(tab: FriendsTab) {
        this.activeFriendsTab.set(tab);
    }

    openFriendsSuggestions() {
        this.setFriendsTab('friends_suggestions');
        this.setView('friends');
    }

    openConversation(conversationId: string) {
        this.pendingDirectConversationUser.set(null);
        this.pendingConversationId.set(conversationId);
        this.setView('messages');
    }

    openDirectConversation(user: DirectConversationTarget) {
        this.pendingConversationId.set(null);
        this.pendingDirectConversationUser.set(user);
        this.setView('messages');
    }

    goToMessagesWelcome() {
        this.convStore.setActiveConversationId('');
        this.router.navigate(['/conversations']);
    }
}

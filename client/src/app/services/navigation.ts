import { Injectable, signal } from '@angular/core';

export type AppView = 'messages' | 'friends' | 'newFeeds';
export type FriendsTab = 'friends' | 'friend_requests' | 'blocked' | 'sent_requests' | 'friends_suggestions';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    activeView = signal<AppView>('messages');
    activeFriendsTab = signal<FriendsTab>('friends_suggestions');
    pendingConversationId = signal<string | null>(null);

    setView(view: AppView) {
        this.activeView.set(view);
    }

    setFriendsTab(tab: FriendsTab) {
        this.activeFriendsTab.set(tab);
    }

    openFriendsSuggestions() {
        this.setFriendsTab('friends_suggestions');
        this.setView('friends');
    }

    openConversation(conversationId: string) {
        this.pendingConversationId.set(conversationId);
        this.setView('messages');
    }
}

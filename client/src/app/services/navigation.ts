import { Injectable, signal } from '@angular/core';

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
    activeView = signal<AppView>('messages');
    activeFriendsTab = signal<FriendsTab>('friends_suggestions');
    pendingConversationId = signal<string | null>(null);
    pendingDirectConversationUser = signal<DirectConversationTarget | null>(null);
    messagesWelcomeResetTick = signal(0);

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
        this.pendingConversationId.set(null);
        this.messagesWelcomeResetTick.update((v) => v + 1);
        this.setView('messages');
    }
}

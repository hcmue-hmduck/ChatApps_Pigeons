import {
    Component,
    Input,
    OnInit,
    OnDestroy,
    signal,
    inject,
    effect,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesLayoutComponent } from '../messagesLayout/messagesLayout.component';
import { NavigationService } from '../../services/navigation';
import { SocketService } from '../../services/socket';
import { Conversation } from '../../services/conversation';
import { GroupAvatarLayoutComponent } from '../groupAvatarLayout/groupAvatarLayout.component';
import { IntroLayoutComponent } from '../introLayout/introLayout.component';

export interface UserPresence {
    status: string;
    last_online_at: string | Date;
}

import { ConversationInforLayoutComponent } from '../conversationInforLayout/conversationInforLayout.component';

@Component({
    selector: 'conversation-layout',
    standalone: true,
    imports: [CommonModule, MessagesLayoutComponent, ConversationInforLayoutComponent, GroupAvatarLayoutComponent, IntroLayoutComponent],
    templateUrl: './conversationLayout.component.html',
    styleUrls: ['./conversationLayout.component.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationLayoutComponent implements OnInit, OnDestroy {
    @Input() currentUserId: string = '';

    conversations: any = {};
    onlineUsers = signal<Set<string>>(new Set());
    UserPresence = signal<Map<string, UserPresence>>(new Map());

    navService = inject(NavigationService);
    cdr = inject(ChangeDetectorRef);
    conversationService = inject(Conversation);

    // Sidebar toggle state
    showConversationInfor = signal(false);

    toggleConversationInfor() {
        this.showConversationInfor.update(v => !v);
    }

    // Conversation selection state (local to this component)
    selectedConversationId: string = '';
    selectedConversationType = '';
    getMessageInfor: any = {};
    isFirstConversationReady = signal(false);

    // Tick signals for relative time display
    tick1s = signal(0);
    tick60s = signal(0);
    tick3600s = signal(0);

    private interval1s: any;
    private interval60s: any;
    private interval3600s: any;

    constructor(private socketService: SocketService) {
        effect(() => {
            const pendingId = this.navService.pendingConversationId();
            if (!pendingId) return;
            this.selectOrReloadConversation(pendingId);
        });
    }

    ngOnInit() {
        if (this.currentUserId) {
            this.setupSocketListeners();
            this.loadConversations();
            this.startTimerIntervals();
            this.socketService.emit('userOnline', this.currentUserId);
        }
    }

    ngOnDestroy() {
        this.socketService.off('updateProfile');
        this.socketService.off('updateConversation');
        this.socketService.off('userStatusChanged');
        this.socketService.off('onlineUsersList');
        this.socketService.off('newConversation');
        clearInterval(this.interval1s);
        clearInterval(this.interval60s);
        clearInterval(this.interval3600s);
    }

    // ── Load Data ─────────────────────────────────────────
    loadConversations() {
        this.conversationService.getConversations(this.currentUserId).subscribe({
            next: (response) => {
                this.conversations = response.metadata || {};
                const joined = this.conversations.homeConversationData?.joinedConversations || [];
                if (joined.length > 0) {
                    if (!this.isFirstConversationReady()) {
                        this.handleConversationID(joined[0]);
                    }
                } else {
                    this.selectedConversationId = '';
                    this.selectedConversationType = '';
                    this.getMessageInfor = {};
                    this.showConversationInfor.set(false);
                    if (!this.isFirstConversationReady()) {
                        this.isFirstConversationReady.set(true);
                    }
                }

                joined.forEach((conv: any) =>
                    this.socketService.emit('joinConversation', conv.conversation_id)
                );

                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error loading conversations:', error);
                this.isFirstConversationReady.set(true);
            },
        });
    }

    private setupSocketListeners() {
        this.socketService.on('onlineUsersList', (userIds: string[]) => {
            this.onlineUsers.set(new Set(userIds));
            this.UserPresence.update(currentMap => {
                const updatedMap = new Map(currentMap);
                userIds.forEach((userId: string) => {
                    updatedMap.set(userId, {
                        status: 'online',
                        last_online_at: new Date()
                    });
                });
                return updatedMap;
            });
        });

        this.socketService.on('userStatusChanged', (data: { userId: string; status: string, last_online_at: Date }) => {
            const set = new Set(this.onlineUsers());
            data.status === 'online' ? set.add(data.userId) : set.delete(data.userId);
            this.onlineUsers.set(set);

            this.UserPresence.update(currentMap => {
                const updatedMap = new Map(currentMap);
                updatedMap.set(data.userId, {
                    status: data.status,
                    last_online_at: data.last_online_at
                });
                return updatedMap;
            });
        });

        this.socketService.on('newConversation', ({ conversationId }: { conversationId: string }) => {
            this.conversationService.getConversations(this.currentUserId).subscribe({
                next: (response) => {
                    this.conversations = response.metadata || {};
                    const joined = this.conversations?.homeConversationData?.joinedConversations || [];
                    joined.forEach((conv: any) =>
                        this.socketService.emit('joinConversation', conv.conversation_id)
                    );
                    this.cdr.markForCheck();
                },
                error: () => {}
            });
        });

        this.socketService.on('updateConversation', (data: any) => {
            const cur = this.conversations;
            if (!cur?.homeConversationData?.joinedConversations) return;
            const updated = [
                ...cur.homeConversationData.joinedConversations
                    .filter((c: any) => c.conversation_id === data.conversation_id)
                    .map((c: any) => ({
                        ...c,
                        lastMessage: {
                            ...(c.lastMessage || {}),
                            sender_id: data.sender_id,
                            content: data.content,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            is_deleted: data.is_deleted,
                            message_type: data.message_type,
                        },
                    })),
                ...cur.homeConversationData.joinedConversations.filter(
                    (c: any) => c.conversation_id !== data.conversation_id,
                ),
            ];
            this.conversations = {
                ...cur,
                homeConversationData: { ...cur.homeConversationData, joinedConversations: updated },
            };
            this.cdr.markForCheck();
        });

        this.socketService.on('updateProfile', (data: any) => {
            const curConversations = this.conversations;
            let updatedUserInfo = curConversations?.homeConversationData?.userInfo;

            if (data.id === this.currentUserId) {
                updatedUserInfo = data;
            }

            const convList = curConversations?.homeConversationData?.joinedConversations;
            if (!convList?.length) {
                if (data.id === this.currentUserId && curConversations?.homeConversationData) {
                    this.conversations = {
                        ...curConversations,
                        homeConversationData: {
                            ...curConversations.homeConversationData,
                            userInfo: updatedUserInfo
                        }
                    };
                }
                return;
            }

            const updatedConvList = convList.map((conv: any) => {
                const updatedParticipants = conv.participants?.map((p: any) =>
                    p.user_id === data.id ? { ...p, full_name: data.full_name, avatar_url: data.avatar_url } : p
                );

                const isDirectWithUpdated =
                    conv.type === 'direct' &&
                    data.id !== this.currentUserId &&
                    conv.participants?.some((p: any) => p.user_id === data.id);

                if (conv.conversation_id === this.selectedConversationId && this.selectedConversationId) {
                    const isDirectOtherUser = conv.type === 'direct' && data.id !== this.currentUserId;
                    const updatedTargetParticipant = updatedParticipants.find((p: any) => p.user_id === data.id);
                    this.getMessageInfor = {
                        ...this.getMessageInfor,
                        user_info: updatedUserInfo,
                        title: isDirectOtherUser ? data.full_name : conv.title,
                        other_participant: isDirectOtherUser ? updatedTargetParticipant : this.getMessageInfor.other_participant,
                        participants: updatedParticipants
                    };
                }

                return {
                    ...conv,
                    participants: updatedParticipants,
                    ...(isDirectWithUpdated && { title: data.full_name }),
                };
            });

            this.conversations = {
                ...curConversations,
                homeConversationData: {
                    ...curConversations.homeConversationData,
                    userInfo: updatedUserInfo,
                    joinedConversations: updatedConvList
                }
            };
            this.cdr.markForCheck();
        });
    }

    private startTimerIntervals() {
        this.interval1s = setInterval(() => { this.tick1s.update(v => v + 1); this.cdr.markForCheck(); }, 30000);
        this.interval60s = setInterval(() => { this.tick60s.update(v => v + 1); this.cdr.markForCheck(); }, 300000);
        this.interval3600s = setInterval(() => { this.tick3600s.update(v => v + 1); this.cdr.markForCheck(); }, 3600000);
    }

    // ── Conversation Selection ──────────────────────────────
    handleConversationID(conv: any) {
        this.socketService.off('newMessage');
        this.selectedConversationId = conv.conversation_id;
        this.selectedConversationType = conv.type;
        const selectedConv = this.conversations?.homeConversationData?.joinedConversations?.find(
            (c: any) => c.conversation_id === this.selectedConversationId,
        );
        const otherParticipant = selectedConv?.type === 'direct' ? this.getOtherParticipant(selectedConv) : null;
        this.getMessageInfor = {
            title: selectedConv?.title,
            participants: selectedConv?.participants,
            user_info: this.conversations?.homeConversationData?.userInfo,
            type: selectedConv?.type,
            avatar_url: selectedConv?.avatar_url,
            other_participant: otherParticipant,
        };
        if (!this.isFirstConversationReady()) {
            this.isFirstConversationReady.set(true);
        }
        this.navService.setView('messages');
    }

    createConversation() {
        this.navService.openFriendsSuggestions();
    }

    private selectOrReloadConversation(conversationId: string) {
        const joined = this.conversations?.homeConversationData?.joinedConversations || [];
        const found = joined.find((c: any) => c.conversation_id === conversationId);
        if (found) {
            this.handleConversationID(found);
            this.navService.pendingConversationId.set(null);
        } else {
            this.conversationService.getConversations(this.currentUserId).subscribe({
                next: (response) => {
                    this.conversations = response.metadata || {};
                    const newJoined = this.conversations?.homeConversationData?.joinedConversations || [];
                    newJoined.forEach((conv: any) =>
                        this.socketService.emit('joinConversation', conv.conversation_id)
                    );
                    const target = newJoined.find((c: any) => c.conversation_id === conversationId);
                    if (target) {
                        this.handleConversationID(target);
                    }
                    this.navService.pendingConversationId.set(null);
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.navService.pendingConversationId.set(null);
                }
            });
        }
    }

    hasConversations(): boolean {
        return (this.conversations?.homeConversationData?.joinedConversations?.length || 0) > 0;
    }

    // ── Helpers ────────────────────────────────────────────
    getOtherParticipant(conv: any): any {
        if (conv.participants?.length !== 2) return null;
        return conv.participants.find((p: any) => p.user_id !== this.currentUserId);
    }

    isUserOnline(userId: string): boolean {
        // return this.onlineUsers().has(userId);
        return this.UserPresence().get(userId)?.status === 'online';
    }

    getUserLastOnlineAt(participant: any): string | Date {
        // Lấy dữ liệu realtime từ UserPresence trước
        const presence = this.UserPresence().get(participant.user_id);
        if (presence && presence.last_online_at) {
            return presence.last_online_at;
        }
        // Nếu không có realtime, lấy DB data khởi tạo ban đầu
        return participant.last_online_at;
    }

    hasOnlineUser(conv: any): boolean {
        if (!conv.participants) return false;
        return conv.participants.some((p: any) => p.user_id !== this.currentUserId && this.isUserOnline(p.user_id));
    }

    getLastMessageSenderName(conv: any): string {
        const { lastMessage, participants } = conv ?? {};
        if (!lastMessage) return '';
        const isSystem = lastMessage.message_type === 'system';
        const isCurrentUser = lastMessage.sender_id === this.currentUserId;
        const isDirectChat = participants.length < 3;
        if (isDirectChat && !isCurrentUser) {
            if (!isSystem) return '';
            const sender = participants.find((p: any) => p.user_id === lastMessage.sender_id);
            return sender?.full_name ?? 'Ai đó';
        }
        if (isCurrentUser) return isSystem ? 'Bạn' : 'Bạn:';
        const sender = participants.find((p: any) => p.user_id === lastMessage.sender_id);
        const name = sender?.full_name ?? 'Ai đó';
        return isSystem ? name : `${name}:`;
    }

    relativeTime(dateInput: string | Date, tick1s: number, tick60s: number, tick3600s: number): string {
        if (!dateInput) return '';

        // Đoạn này lấy timestamp kể cả khi đưa vào là String hay Date object
        const timeToCompare = typeof dateInput === 'string'
            ? new Date(dateInput.endsWith('Z') || dateInput.length !== 23 ? dateInput : dateInput.replace(' ', 'T') + 'Z').getTime()
            : dateInput.getTime();

        const diff = Math.floor((Date.now() - timeToCompare) / 1000);
        if (diff <= 60) { const _ = tick1s; return 'Vừa xong'; }
        if (diff < 3600) { const _ = tick60s; return `${Math.floor(diff / 60)} phút`; }
        const _ = tick3600s;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng`;
        return `${Math.floor(diff / 31536000)} năm`;
    }
}

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
    NgZone,
    ViewChild,
    ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MessagesLayoutComponent } from '../messagesLayout/messagesLayout.component';
import { NavigationService } from '../../services/navigation';
import { SocketService } from '../../services/socket';
import { Conversation } from '../../services/conversation';
import { SearchService } from '../../services/searchService';
import { GroupAvatarLayoutComponent } from '../groupAvatarLayout/groupAvatarLayout.component';
import { IntroLayoutComponent } from '../introLayout/introLayout.component';
import { Participant } from '../../services/participant';
import { UserBlock } from '../../services/userBlock';
import { DateTimeUtils } from '../../utils/DateTimeUtils/datetimeUtils';
import { FileUtils } from '../../utils/FileUtils/fileUltils';

export interface UserPresence {
    status: string;
    last_online_at: string | Date;
}

import { ConversationInfoLayoutComponent } from '../conversationInforLayout/conversationInforLayout.component';
import { title } from 'node:process';

@Component({
    selector: 'conversation-layout',
    standalone: true,
    imports: [CommonModule, MessagesLayoutComponent, ConversationInfoLayoutComponent, GroupAvatarLayoutComponent, IntroLayoutComponent],
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
    participantService = inject(Participant);
    userBlockService = inject(UserBlock);
    searchService = inject(SearchService);
    private ngZone = inject(NgZone);
    private timeUpdateInterval: any;

    @ViewChild('searchInput') searchInput!: ElementRef;

    // Sidebar toggle state
    showConversationInfor = signal(false);

    toggleConversationInfor() {
        this.showConversationInfor.update(v => !v);
    }

    userBlock = signal<any[]>([]);

    // Conversation selection state (local to this component)
    selectedConversationId: string = '';
    selectedConversationType = '';
    getMessageInfor: any = {};
    isFirstConversationReady = signal(false);
    aiSummaryTriggerUnreadCount = 0;
    aiSummaryTriggerLastReadMessageId = '';
    aiSummaryTriggerKey = 0;

    // Search state
    searchTerm = signal('');
    searchResults = signal<any[]>([]);
    isSearching = signal(false);
    isSearchView = signal(false);
    private searchSubject = new Subject<string>();

    private onUpdateProfileSocket?: (data: any) => void;
    private onUpdateParticipantSocket?: (data: any) => void;
    private onAddMemberSocket?: (data: any) => void;
    private onOnlineUsersListSocket?: (userIds: string[]) => void;
    private onUserStatusChangedSocket?: (data: any) => void;
    private onNewConversationSocket?: (data: any) => void;
    private onUpdateConversationSocket?: (data: any) => void;

    private readUpdateInFlightByConversation = new Map<string, boolean>();
    private pendingReadMessageIdByConversation = new Map<string, string>();
    private hasInitWelcomeResetEffect = false;
    private aiSummaryTriggerRequestToken = 0;

    constructor(
        private socketService: SocketService,
        public dateTimeUtils: DateTimeUtils,
        public fileUtils: FileUtils
    ) {
        effect(() => {
            const pendingId = this.navService.pendingConversationId();
            if (!pendingId) return;
            this.selectOrReloadConversation(pendingId);
        });

        effect(() => {
            const resetTick = this.navService.messagesWelcomeResetTick();
            if (!this.hasInitWelcomeResetEffect) {
                this.hasInitWelcomeResetEffect = true;
                return;
            }
            if (resetTick < 1) return;
            this.resetToWelcome();
        });
    }

    ngOnInit() {
        if (this.currentUserId) {
            this.setupSocketListeners();
            this.loadConversations();
            this.socketService.emit('userOnline', this.currentUserId);
        }

        // Setup search debounce
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term.trim()) {
                    this.isSearching.set(false);
                    return of({ metadata: { users: [] } });
                }
                this.isSearching.set(true);
                return this.searchService.searchUsers(term);
            })
        ).subscribe({
            next: (response) => {
                this.searchResults.set(response.metadata?.users || []);
                this.isSearching.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Search error:', err);
                this.isSearching.set(false);
                this.cdr.markForCheck();
            }
        });

        // Đảm bảo tick luôn cập nhật đúng mỗi phút
        this.timeUpdateInterval = setInterval(() => {
            this.ngZone.run(() => {
                this.cdr.markForCheck();
            });
        }, 60000); // 60s cập nhật tick
    }

    ngOnDestroy() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        if (this.onUpdateProfileSocket) this.socketService.off('updateProfile', this.onUpdateProfileSocket);
        if (this.onUpdateParticipantSocket) this.socketService.off('updateParticipant', this.onUpdateParticipantSocket);
        if (this.onAddMemberSocket) this.socketService.off('addMember', this.onAddMemberSocket);
        if (this.onOnlineUsersListSocket) this.socketService.off('onlineUsersList', this.onOnlineUsersListSocket);
        if (this.onUserStatusChangedSocket) this.socketService.off('userStatusChanged', this.onUserStatusChangedSocket);
        if (this.onNewConversationSocket) this.socketService.off('newConversation', this.onNewConversationSocket);
        if (this.onUpdateConversationSocket) this.socketService.off('updateConversation', this.onUpdateConversationSocket);
    }

    // ── Load Data ─────────────────────────────────────────
    loadConversations() {
        this.conversationService.getConversations(this.currentUserId).subscribe({
            next: (response) => {
                this.conversations = response.metadata || {};
                const joined = this.conversations.homeConversationData?.joinedConversations || [];
                if (joined.length > 0) {
                    this.selectedConversationId = '';
                    this.selectedConversationType = '';
                    this.getMessageInfor = {};
                    this.showConversationInfor.set(false);
                    if (!this.isFirstConversationReady()) {
                        this.isFirstConversationReady.set(true);
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

        this.userBlockService.getBlockedUserByUserId(this.currentUserId).subscribe({
            next: (response) => {
                this.userBlock.set(response.metadata?.userBlocks || []);
                console.log('User Block:', this.userBlock());
            },
            error: (error) => {
                console.error('Error:', error);
            },
        });
    }

    private setupSocketListeners() {
        this.onOnlineUsersListSocket = (userIds: string[]) => {
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
        };
        this.socketService.on('onlineUsersList', this.onOnlineUsersListSocket);

        this.onUserStatusChangedSocket = (data: { userId: string; status: string, last_online_at: Date }) => {
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
        };
        this.socketService.on('userStatusChanged', this.onUserStatusChangedSocket);

        this.onNewConversationSocket = (data: any) => {
            const { conversationId, senderId } = data;

            
            // JOIN ROOM NGAY LẬP TỨC để không bỏ lỡ tin nhắn đầu tiên (race condition)
            this.socketService.emit('joinConversation', conversationId);

            const currentJoined = this.conversations?.homeConversationData?.joinedConversations || [];

            
            // Nếu hội thoại đã có trong danh sách, không cần làm gì thêm (đã join room ở trên)
            const alreadyJoined = currentJoined.some((c: any) => c.conversation_id === conversationId);
            if (alreadyJoined) return;

            // KIỂM TRA NẾU ĐANG Ở CONVERSATION ẢO VỚI NGƯỜI NÀY - TỰ ĐỘNG CHUYỂN SANG ID THẬT
            if (this.selectedConversationId && this.selectedConversationId.startsWith('conv_')) {
                const otherUserId = this.getMessageInfor?.other_participant?.user_id;
                if (otherUserId === senderId) {
                    this.handleConversationCreated(conversationId, data.participants);
                    // Tiếp tục chạy để loadConversations() và lấy toàn bộ metadata (bao gồm Participant ID thật)
                }
            }

            this.conversationService.getConversations(this.currentUserId).subscribe({
                next: (response) => {
                    this.conversations = response.metadata || {};
                    const joined = this.conversations?.homeConversationData?.joinedConversations || [];
                    
                    // NẾU ĐANG Ở TRONG PHÒNG VỪU NÂNG CẤP, CẬP NHẬT LẠI getMessageInfor
                    const updatedConv = joined.find((c: any) => c.conversation_id === this.selectedConversationId);
                    if (updatedConv) {
                        this.handleConversationID(updatedConv);
                    }

                    joined.forEach((conv: any) =>
                        this.socketService.emit('joinConversation', conv.conversation_id)
                    );
                    this.cdr.markForCheck();
                },
                error: () => { }
            });
        };
        this.socketService.on('newConversation', this.onNewConversationSocket);

        this.onUpdateConversationSocket = (data: any) => {
            const cur = this.conversations;
            if (!cur?.homeConversationData?.joinedConversations) return;

            const convList = [...cur.homeConversationData.joinedConversations];
            const index = convList.findIndex((c: any) => c.conversation_id === data.conversation_id);

            if (index !== -1) {
                const conv = { ...convList[index] };
                const isOpening = this.selectedConversationId === data.conversation_id;
                const isFromOther = data.sender_id !== this.currentUserId;
                const messageId = data.id || data.message_id;

                conv.lastMessage = {
                    ...(conv.lastMessage || {}),
                    sender_id: data.sender_id,
                    content: data.content,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    is_deleted: data.is_deleted,
                    message_type: data.message_type,
                    id: messageId || conv.lastMessage?.id // Use available ID
                };

                // Logic đếm số lượng tin nhắn chưa đọc
                if (isOpening) {
                    conv.unread_count = 0;
                    if (messageId) {
                        conv.last_read_message_id = messageId; // Cập nhật mốc đã đọc local
                        conv.participants = conv.participants?.map((p: any) =>
                            p.user_id === this.currentUserId
                                ? { ...p, last_read_message_id: messageId }
                                : p
                        );
                    }

                    // Nếu đang mở mà có tin nhắn mới từ người khác -> Tự động đánh dấu là đã đọc trên server
                    if (isFromOther && messageId) {
                        const currentParticipant = conv.participants?.find((p: any) => p.user_id === this.currentUserId);
                        if (currentParticipant) {
                            this.queueParticipantReadUpdate(conv.conversation_id, currentParticipant.id, messageId);
                        }
                    }
                } else if (isFromOther) {
                    conv.unread_count = (conv.unread_count || 0) + 1;
                }

                // Đưa cuộc hội thoại mới nhất lên đầu danh sách
                convList.splice(index, 1);
                convList.unshift(conv);

                this.conversations = {
                    ...cur,
                    homeConversationData: { ...cur.homeConversationData, joinedConversations: convList },
                };
                this.cdr.markForCheck();
            }
        };
        this.socketService.on('updateConversation', this.onUpdateConversationSocket);

        this.onUpdateProfileSocket = (data: any) => {
            console.log('Received updateProfile event in Conversation:', data);
            const curConversations = this.conversations;
            let updatedUserInfo = curConversations?.homeConversationData?.userInfo;

            if (data.id === this.currentUserId) {
                updatedUserInfo = data;
            }

            const convList = curConversations?.homeConversationData?.joinedConversations;
            console.log('UpdateProfile in Messages:', convList);
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
        };
        this.socketService.on('updateProfile', this.onUpdateProfileSocket);

        this.onUpdateParticipantSocket = (data: any) => {
            const cur = this.conversations;
            if (!cur?.homeConversationData?.joinedConversations) return;

            const updated = cur.homeConversationData.joinedConversations.map((c: any) => {
                if (c.conversation_id === data.conversation_id) {
                    const updatedParticipants = c.participants?.map((p: any) => {
                        if (p.user_id === data.user_id) {
                            return { ...p, last_read_message_id: data.last_read_message_id };
                        }
                        return p;
                    });

                    const isMe = data.user_id === this.currentUserId;

                    return {
                        ...c,
                        participants: updatedParticipants,
                        last_read_message_id: isMe ? data.last_read_message_id : c.last_read_message_id,
                        unread_count: isMe ? 0 : c.unread_count
                    };
                }
                return c;
            });

            this.conversations = {
                ...cur,
                homeConversationData: { ...cur.homeConversationData, joinedConversations: updated },
            };
            this.cdr.markForCheck();
        };
        this.socketService.on('updateParticipant', this.onUpdateParticipantSocket);

        this.onAddMemberSocket = (data: any) => {
            console.log('Received addMember event in Conversation:', data);
            this.conversationService.getConversations(this.currentUserId).subscribe({
                next: (response) => {
                    this.conversations = response.metadata || {};
                    const joined = this.conversations?.homeConversationData?.joinedConversations || [];

                    
                    if (this.selectedConversationId === data.conversation_id) {
                        const target = joined.find((c: any) => c.conversation_id === data.conversation_id);
                        if (target) {
                            this.handleConversationID(target);
                        }
                    }
                    this.cdr.markForCheck();
                }
            });
        };
        this.socketService.on('addMember', this.onAddMemberSocket);
    }

    handleConversationCreated(newId: string, realParticipants?: any[]) {
        const oldId = this.selectedConversationId;
        this.selectedConversationId = newId;

        // JOIN ROOM MỚI NGAY LẬP TỨC
        this.socketService.emit('joinConversation', newId);

        // Cập nhật trực tiếp trong mảng hội thoại để tránh reload toàn bộ danh sách
        const joined = this.conversations?.homeConversationData?.joinedConversations;
        if (joined) {
            const index = joined.findIndex((c: any) => c.conversation_id === oldId);
            if (index !== -1) {
                // Thay thế ID ảo bằng ID thật
                joined[index].conversation_id = newId;

                
                // NẾU CÓ THÔNG TIN PARTICIPANTS THỰC, CẬP NHẬT LUÔN
                if (realParticipants) {
                    joined[index].participants = realParticipants;
                }

                // Cập nhật lại tham chiếu để Angular detect changes (vì OnPush)
                this.conversations = {
                    ...this.conversations,
                    homeConversationData: {
                        ...this.conversations.homeConversationData,
                        joinedConversations: [...joined],
                    },
                };

                // Cập nhật getMessageInfor ngay lập tức để tránh lỗi participant ID ảo
                const updatedConv = joined[index];
                if (this.selectedConversationId === updatedConv.conversation_id) {
                    this.handleConversationID(updatedConv);
                }
            }
        }
        this.cdr.markForCheck();
    }

    // ── Conversation Selection ──────────────────────────────
    handleConversationID(conv: any) {
        // this.socketService.off('newMessage');
        const unreadCountOnClick = Number(conv?.unread_count || 0);
        this.triggerAiSummarySuggestion(conv, unreadCountOnClick);

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

        // Logic "Đã đọc": reset count locally và notify server
        if (conv.unread_count > 0 || (conv.lastMessage && conv.last_read_message_id !== conv.lastMessage.id)) {
            const currentParticipant = conv.participants.find((p: any) => p.user_id === this.currentUserId);

            if (currentParticipant && conv.lastMessage?.id) {
                // 1. Reset cục bộ để UI mất badge ngay lập tức
                conv.unread_count = 0;
                conv.last_read_message_id = conv.lastMessage.id;
                conv.participants = conv.participants?.map((p: any) =>
                    p.user_id === this.currentUserId
                        ? { ...p, last_read_message_id: conv.lastMessage.id }
                        : p
                );

                // 2. Gọi API để lưu vào Database
                this.queueParticipantReadUpdate(conv.conversation_id, currentParticipant.id, conv.lastMessage.id);
            }
        }
    }

    private triggerAiSummarySuggestion(conv: any, unreadCount: number) {
        const localLastReadMessageId = this.getLastReadMessageIdFromConversation(conv);

        if (unreadCount < 10) {
            this.setAiSummaryTrigger(unreadCount, localLastReadMessageId);
            return;
        }

        // Clear previous popup state while waiting for fresh last_read_message_id from API.
        this.setAiSummaryTrigger(0, '');

        const conversationId = conv?.conversation_id ? String(conv.conversation_id) : '';
        const userId = String(this.currentUserId || '').trim();
        if (!conversationId || !userId) {
            this.setAiSummaryTrigger(unreadCount, localLastReadMessageId);
            return;
        }

        const requestToken = ++this.aiSummaryTriggerRequestToken;
        this.participantService.getLastReadMessageByConversationAndUser(conversationId, userId).subscribe({
            next: (response) => {
                if (requestToken !== this.aiSummaryTriggerRequestToken) return;

                const lastReadFromApi = response?.metadata?.last_read_message_id
                    ? String(response.metadata.last_read_message_id)
                    : '';

                this.setAiSummaryTrigger(unreadCount, lastReadFromApi || localLastReadMessageId);
                this.cdr.markForCheck();
            },
            error: (error) => {
                if (requestToken !== this.aiSummaryTriggerRequestToken) return;

                console.error('Error fetching last read message id for summary trigger:', error);
                this.setAiSummaryTrigger(unreadCount, localLastReadMessageId);
                this.cdr.markForCheck();
            }
        });
    }

    private getLastReadMessageIdFromConversation(conv: any): string {
        const currentParticipant = conv?.participants?.find((p: any) => p.user_id === this.currentUserId);
        const participantLastReadMessageId = currentParticipant?.last_read_message_id
            ? String(currentParticipant.last_read_message_id)
            : '';
        const conversationLastReadMessageId = conv?.last_read_message_id
            ? String(conv.last_read_message_id)
            : '';

        return participantLastReadMessageId || conversationLastReadMessageId;
    }

    private setAiSummaryTrigger(unreadCount: number, lastReadMessageId: string) {
        this.aiSummaryTriggerUnreadCount = unreadCount;
        this.aiSummaryTriggerLastReadMessageId = lastReadMessageId;
        this.aiSummaryTriggerKey += 1;
    }

    private queueParticipantReadUpdate(conversationId: string, participantId: string, lastReadMessageId: string) {
        if (!participantId || participantId.startsWith('par_')) {
            console.warn('[SYNC] Skipping read update for virtual participant:', participantId);
            return;
        }

        if (!conversationId || !lastReadMessageId) return;

        this.pendingReadMessageIdByConversation.set(conversationId, lastReadMessageId);
        if (this.readUpdateInFlightByConversation.get(conversationId)) return;

        const flush = () => {
            const latestMessageId = this.pendingReadMessageIdByConversation.get(conversationId);
            if (!latestMessageId) return;

            this.readUpdateInFlightByConversation.set(conversationId, true);
            this.participantService.putParticipant({
                id: participantId,
                last_read_message_id: latestMessageId
            }).subscribe({
                next: () => {
                    this.socketService.emit('updateParticipant', {
                        conversation_id: conversationId,
                        user_id: this.currentUserId,
                        last_read_message_id: latestMessageId,
                        participant_id: participantId
                    });

                    const newestPending = this.pendingReadMessageIdByConversation.get(conversationId);
                    if (newestPending === latestMessageId) {
                        this.pendingReadMessageIdByConversation.delete(conversationId);
                        this.readUpdateInFlightByConversation.set(conversationId, false);
                        this.cdr.markForCheck();
                        return;
                    }

                    this.readUpdateInFlightByConversation.set(conversationId, false);
                    flush();
                },
                error: (err) => {
                    this.readUpdateInFlightByConversation.set(conversationId, false);
                    console.error('Error marking as read:', err);
                }
            });
        };

        flush();
    }


    createConversation() {
        this.navService.openFriendsSuggestions();
    }

    private resetToWelcome() {
        this.selectedConversationId = '';
        this.selectedConversationType = '';
        this.getMessageInfor = {};
        this.showConversationInfor.set(false);
        if (!this.isFirstConversationReady()) {
            this.isFirstConversationReady.set(true);
        }
        this.cdr.markForCheck();
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

    relativeTime(dateInput: string | Date): string {
        // Luôn tính từ thời điểm hiện tại, không cache
        const now = new Date();
        const date = new Date(dateInput);
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 60) return 'Vừa xong';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin} phút`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} giờ`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay} ngày`;
        const diffWeek = Math.floor(diffDay / 7);
        if (diffWeek < 52) return `${diffWeek} tuần`;
        const diffYear = now.getFullYear() - date.getFullYear();
        if (diffYear < 10) return `${diffYear} năm`;
        // Nếu quá 10 năm, hiển thị đầy đủ ngày/tháng/năm
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // ── Search Actions ─────────────────────────────────────
    onSearch(event: any) {
        const term = event.target.value;
        this.searchTerm.set(term);
        this.searchSubject.next(term);
    }

    enterSearch() {
        this.isSearchView.set(true);
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.nativeElement.focus();
            }
        }, 50);
    }

    exitSearch() {
        this.isSearchView.set(false);
        this.searchTerm.set('');
        this.searchResults.set([]);
        this.cdr.markForCheck();
    }

    selectSearchResult(user: any) {
        // Clear search
        this.exitSearch();

        const joined = this.conversations?.homeConversationData?.joinedConversations || [];
        const existingConv = joined.find((c: any) => 
            c.type === 'direct' && c.participants.some((p: any) => p.user_id === user.id)
        );

        if (existingConv) {
            this.handleConversationID(existingConv);
        } else {
            const randomId = Math.random().toString(36).substring(2, 15);
            const newConv = {
                conversation_id: 'conv_' + randomId,
                type: 'direct',
                title: user.full_name,
                avatar_url: user.avatar_url,
                participants: [
                    {
                        id: 'par_' + randomId,
                        user_id: this.currentUserId,
                        full_name: this.conversations?.homeConversationData?.userInfo?.full_name,
                        avatar_url: this.conversations?.homeConversationData?.userInfo?.avatar_url,
                        last_online_at: this.conversations?.homeConversationData?.userInfo?.last_online_at,
                    },
                    {
                        id: 'par_' + randomId,
                        user_id: user.id,
                        full_name: user.full_name,
                        avatar_url: user.avatar_url,
                        last_online_at: user.last_online_at,
                    },
                ],
                last_message: null,
                unread_count: 0,
                updated_at: new Date().toISOString(),
            };
            this.conversations.homeConversationData?.joinedConversations.unshift(newConv);
            this.handleConversationID(newConv);
        }
    }
}

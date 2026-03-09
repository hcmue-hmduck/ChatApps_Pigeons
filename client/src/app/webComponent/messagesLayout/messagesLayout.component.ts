import { CommonModule } from '@angular/common';
import {
    AfterViewChecked,
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
    effect,
    inject,
    signal,
    untracked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { GROUP_CALL } from '../../models/callSessionData.model';
import { AuthService } from '../../services/authService';
import { CallService } from '../../services/callService';
import { Conversation } from '../../services/conversation';
import { Messages } from '../../services/messages';
import { SocketService } from '../../services/socket';

export interface UserPresence {
    status: string;
    last_online_at: string | Date;
}

@Component({
    selector: 'messages-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, PickerModule],
    templateUrl: './messagesLayout.component.html',
    styleUrls: ['./messagesLayout.component.css'],
})
export class MessagesLayoutComponent
    implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
    protected readonly title = signal('client');
    callService = inject(CallService);
    authService = inject(AuthService);

    getMessagesData = signal<any>({});

    loading = false;
    error = '';
    newMessage: string = '';
    messageStatus: string = 'Đã gửi';

    @Input() conversationId: string = '';
    @Input() conversationType: string = '';
    @Input() currentUserId: any = {};
    @Input() getMessageInfor: any = {};
    @Input() onlineUsers: Set<string> = new Set();
    @Input() UserPresence: Map<string, UserPresence> = new Map();
    @Input() tick1s: number = 0;
    @Input() tick60s: number = 0;
    @Input() tick3600s: number = 0;

    @ViewChild('messagesContent') messagesContent!: ElementRef<HTMLDivElement>;
    @ViewChild('messageInput', { static: false }) messageInput!: ElementRef<HTMLTextAreaElement>;

    autoScroll = true;
    isNearBottom = true;
    showScrollToBottom = false;

    // Check if a user is online
    isUserOnline(userId: string): boolean {
        // return this.onlineUsers.has(userId);
        return this.UserPresence.get(userId)?.status === 'online';
    }

    getUserLastOnlineAt(participant: any): string | Date {
        // Lấy dữ liệu realtime từ UserPresence trước
        const presence = this.UserPresence.get(participant?.user_id);
        if (presence && presence.last_online_at) {
            return presence.last_online_at;
        }
        // Nếu không có realtime, lấy DB data khởi tạo ban đầu
        return participant?.last_online_at;
    }

    relativeTime(dateInput: string | Date, tick1s: number, tick60s: number, tick3600s: number): string {
        if (!dateInput) return '';

        // Đoạn này lấy timestamp kể cả khi đưa vào là String hay Date object
        const timeToCompare = typeof dateInput === 'string'
            ? new Date(dateInput.endsWith('Z') || dateInput.length !== 23 ? dateInput : dateInput.replace(' ', 'T') + 'Z').getTime()
            : dateInput.getTime();

        const diff = Math.floor((Date.now() - timeToCompare) / 1000);
        if (diff <= 60) { const _ = tick1s; return 'vài giây'; }
        if (diff < 3600) { const _ = tick60s; return `${Math.floor(diff / 60)} phút`; }
        const _ = tick3600s;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng`;
        return `${Math.floor(diff / 31536000)} năm`;
    }

    isLoaded = false;
    hasNewMessage = false; // Track new messages when scrolled up

    // Pagination state
    hasMore = true; // Còn tin nhắn cũ hơn để load
    isLoadingMore = false; // Đang load thêm tin nhắn
    currentOffset = 0; // Vị trí hiện tại (số messages đã load)
    lastMessageId = ''; // ID của tin nhắn cuối cùng đã load

    private scrollTimeout: any;
    private lastConversationId: string = ''; // Track conversation changes
    private pendingScroll = false; // Flag to scroll in ngAfterViewChecked
    private needsFocus = true; // Flag to auto-focus input

    // Cache để tránh tính toán lặp lại
    private dateCache = new Map<string, string>();
    private timeCache = new Map<string, string>();

    // Menu state
    showMenuId: string | number | null = null;

    // Highlight state for reply navigation
    highlightedMessageId: string | null = null;
    private highlightTimeout: any;

    // Pinned messages
    pinnedMessages = signal<any[]>([]);
    showPinnedDropdown = false;
    openPinnedMenuId: string | null = null;

    togglePinnedDropdown(event: Event) {
        event.stopPropagation();
        this.showPinnedDropdown = !this.showPinnedDropdown;
    }

    togglePinnedMenu(event: Event, id: string) {
        event.stopPropagation();
        this.openPinnedMenuId = this.openPinnedMenuId === id ? null : id;
    }

    unpinMessage(pm: any) {
        this.messagesService.unpinMessage(pm.id).subscribe({
            next: (response) => {
                this.pinnedMessages.update(prev => prev.filter(p => p.id !== pm.id));

                this.socketService.emit('unpinMessage', pm);

                const messageContent = "đã bỏ ghim tin nhắn: " + pm.content;
                this.postAndBroadcastMessage(messageContent, 'system');
            },
            error: (error) => {
                console.error('Error unpinning message:', error);
            }
        });
    }

    // Helper method to check if should show date separator
    shouldShowDateSeparator(currentMsg: any, prevMsg: any): boolean {
        if (!prevMsg) return true;
        const currentDate = this.getMessageDate(currentMsg.created_at);
        const prevDate = this.getMessageDate(prevMsg.created_at);
        return currentDate !== prevDate;
    }

    // Get date string from message timestamp
    getMessageDate(dateStr: string): string {
        if (!dateStr) return '';
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const date = new Date(isoStr);
        return date.toDateString();
    }

    // Format date label (Today, Yesterday, or specific date)
    formatDateLabel(dateStr: string): string {
        if (!dateStr) return '';

        // Check cache
        if (this.dateCache.has(dateStr)) {
            return this.dateCache.get(dateStr)!;
        }

        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const msgDate = new Date(isoStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let result: string;
        if (msgDate.toDateString() === today.toDateString()) {
            result = 'Hôm nay';
        } else if (msgDate.toDateString() === yesterday.toDateString()) {
            result = 'Hôm qua';
        } else {
            const options: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            };
            result = msgDate.toLocaleDateString('vi-VN', options);
        }

        // Cache result
        this.dateCache.set(dateStr, result);
        return result;
    }

    // Format time as HH:mm
    formatTime(dateStr: string): string {
        if (!dateStr) return '';

        // Check cache
        if (this.timeCache.has(dateStr)) {
            return this.timeCache.get(dateStr)!;
        }

        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const date = new Date(isoStr);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const result = `${hours}:${minutes}`;

        // Cache result
        this.timeCache.set(dateStr, result);
        return result;
    }

    constructor(
        private messagesService: Messages,
        private conversationService: Conversation,
        private socketService: SocketService,
    ) {
        this.initEffect();
    }

    initEffect() {
        // Tạo log join group call
        effect(() => {
            if (this.callService.logJoinGroupCall()) {
                const { content, conversationId } = this.callService.logJoinGroupCall()!;
                if (content && conversationId) this.updateUIWithNewMessage(content, conversationId);

                untracked(() => {
                    this.callService.logJoinGroupCall.set(null);
                })
            }
        })
    }

    // TrackBy function để tối ưu rendering
    trackByMessageId(index: number, message: any): any {
        return message.id;
    }

    // Handle file attachment
    handleFileAttachment() {
        // TODO: Implement file picker
        console.log('File attachment clicked');
    }

    // Handle voice recording
    handleVoiceRecording() {
        // TODO: Implement voice recording
        console.log('Voice recording clicked');
    }

    setupSocketListener(conversationId: string) {
        // Cleanup listener cũ trước khi setup mới
        this.socketService.off('newMessage');
        this.socketService.off('updateMessage');
        this.socketService.off('deleteMessage');
        this.socketService.off('pinMessage');
        this.socketService.off('unpinMessage');

        this.socketService.emit('joinConversation', conversationId);

        // Setup listener cho tin nhắn mới
        this.socketService.on('newMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                this.lastMessageId = data.id;
                console.log('this.lastMessageId', this.lastMessageId);
                // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh duplicate)
                const currentMessages = this.getMessagesData().homeMessagesData?.messages || [];
                const messageExists = currentMessages.some((msg: any) => msg.id === data.id);

                if (!messageExists) {
                    // Ensure parent_message_info includes parent_message_id for socket messages too
                    const messageToAdd = {
                        ...data,
                        parent_message_info: data.parent_message_info
                            ? {
                                ...data.parent_message_info,
                                parent_message_id: data.parent_message_id,
                            }
                            : null,
                    };

                    this.getMessagesData.update((old) => ({
                        ...old,
                        homeMessagesData: {
                            ...old.homeMessagesData,
                            messages: [...currentMessages, messageToAdd],
                        },
                    }));

                    // Tự động scroll xuống nếu đang ở gần cuối
                    if (this.isUserNearBottom()) {
                        this.pendingScroll = true;
                    } else {
                        // Hiển thị badge "new" nếu user đang scroll ở trên
                        this.hasNewMessage = true;
                    }
                }
            }
        });

        // Setup listener cho cập nhật tin nhắn
        this.socketService.on('updateMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                this.getMessagesData.update((old) => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((msg: any) => {
                            if (msg.id === data.id) {
                                return {
                                    ...msg,
                                    content: data.content,
                                    updated_at: new Date().toISOString(),
                                    is_edited: true
                                };
                            } else if (msg.parent_message_id === data.id) {
                                return {
                                    ...msg,
                                    parent_message_info: {
                                        ...msg.parent_message_info,
                                        parent_message_content: data.content,
                                    },
                                };
                            } else {
                                return msg;
                            }
                        }),
                    },
                }));

                // Update nội dung tin nhắn đã ghim nếu tin nhắn đó đang được ghim
                this.pinnedMessages.update(prev =>
                    prev.map(p => p.message_id === data.id
                        ? { ...p, content: data.content }
                        : p
                    )
                );
            }
        });

        // Setup listener cho pin tin nhắn
        this.socketService.on('pinMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                this.pinnedMessages.update(prev => [...prev, data]);
            }
        });

        this.socketService.on('unpinMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                this.pinnedMessages.update(prev => prev.filter(p => p.id !== data.id));
            }
        });

        this.socketService.on('updateProfile', (data: any) => {
            console.log('Received updateProfile event in Messages:', data);

            this.getMessagesData.update((old) => {
                // Nếu chưa có data thì return luôn
                if (!old.homeMessagesData || !old.homeMessagesData.messages) return old;

                return {
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((m: any) => {
                            if (m.sender_id === data.id) {
                                return {
                                    ...m,
                                    sender_name: data.full_name,
                                    sender_avatar: data.avatar_url
                                };
                            } else if (m.parent_message_info?.parent_message_sender_id === data.id) {
                                return {
                                    ...m,
                                    parent_message_info: {
                                        ...m.parent_message_info,
                                        parent_message_name: data.full_name,
                                        parent_message_avatar: data.avatar_url
                                    }
                                };
                            }
                            return m;
                        }),
                    },
                };
            });

            this.pinnedMessages.update((old) => {
                return old.map((m: any) => {
                    if (m.sender_id === data.id) {
                        return {
                            ...m,
                            sender_name: data.full_name
                        };
                    }

                    if (m.parent_message_info?.parent_message_sender_id === data.id) {
                        return {
                            ...m,
                            parent_message_info: {
                                ...m.parent_message_info,
                                parent_message_name: data.full_name
                            }
                        };
                    }
                    return m;
                });
            });
        });

        // Setup listener cho xóa tin nhắn
        this.socketService.on('deleteMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                this.getMessagesData.update((old) => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((m: any) => {
                            // Mark the deleted message itself
                            if (m.id === data.id) {
                                return { ...m, is_deleted: true };
                            }
                            // Update messages that have this deleted message as parent
                            if (
                                m.parent_message_info &&
                                m.parent_message_info.parent_message_id === data.id
                            ) {
                                return {
                                    ...m,
                                    parent_message_info: {
                                        ...m.parent_message_info,
                                        parent_message_is_deleted: true,
                                    },
                                };
                            }
                            return m;
                        }),
                    },
                }));
            }
        });
    }

    ngOnInit() {
        console.log('Online User', this.onlineUsers);
        if (!this.isLoaded) {
            this.isLoaded = true;
            this.loadMessages(this.conversationId);
            this.setupSocketListener(this.conversationId);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        this.isLoaded = true;

        if (changes['conversationId']) {
            const newConversationId = changes['conversationId'].currentValue;
            const oldConversationId = changes['conversationId'].previousValue;

            // Chỉ xử lý khi thực sự thay đổi conversation
            if (newConversationId && newConversationId !== oldConversationId) {
                this.conversationId = newConversationId;

                // Load messages và setup socket mới (cleanup được xử lý trong setupSocketListener)
                this.loadMessages(newConversationId);
                this.needsFocus = true;
                this.setupSocketListener(newConversationId);
            }
        }
    }

    ngAfterViewInit() {
        // Scroll xuống dưới cùng sau khi view được khởi tạo
    }

    ngAfterViewChecked() {
        // Short-circuit: không làm gì nếu không có flag nào cần xử lý
        if (!this.pendingScroll && !this.needsFocus) return;

        if (this.pendingScroll && this.messagesContent?.nativeElement) {
            this.messagesContent.nativeElement.scrollTop = 0;
            this.pendingScroll = false;
        }

        if (this.needsFocus && this.messageInput?.nativeElement) {
            this.messageInput.nativeElement.focus();
            this.needsFocus = false;
        }
    }

    ngOnDestroy() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        // Cleanup socket listener để tránh memory leak
        this.socketService.off('newMessage');
        this.socketService.off('updateMessage');
        this.socketService.off('deleteMessage');
        this.socketService.off('pinMessage');
        this.socketService.off('unpinMessage');
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
        }
    }

    loadMessages(conversationId: string) {
        this.loading = true;
        this.messagesService.getMessages(conversationId).subscribe({
            next: (response) => {
                this.lastMessageId = response.metadata?.homeMessagesData?.last_message_id || '';
                this.getMessagesData.set(response.metadata || {});
                this.pinnedMessages.set(response.metadata?.homeMessagesData?.pinnedMessages || []);
                this.loading = false;

                // Clear cache khi load conversation mới
                this.dateCache.clear();
                this.timeCache.clear();

                // Reset pagination state
                this.currentOffset = response.metadata?.homeMessagesData?.messages?.length || 0;
                this.hasMore = response.metadata?.homeMessagesData?.hasMore ?? true;

                // Chỉ reset scroll khi THAY ĐỔI conversation, không reset khi có tin nhắn mới
                const isConversationChange = this.lastConversationId !== conversationId;
                if (isConversationChange) {
                    this.lastConversationId = conversationId;
                    // Scroll xuống cuối
                    this.pendingScroll = true;
                }
                // Nếu là tin nhắn mới trong cùng conversation, giữ nguyên scroll position
            },
            error: (error) => {
                console.error('Error:', error);
                this.error = error.message;
                this.loading = false;
            },
        });
    }

    // Load thêm tin nhắn cũ hơn khi scroll lên đầu
    loadMoreMessages() {
        if (this.isLoadingMore || !this.hasMore) return;

        this.isLoadingMore = true;

        this.messagesService.getMessages(this.conversationId, 50, this.currentOffset).subscribe({
            next: (response) => {
                const olderMessages = response.metadata?.homeMessagesData?.messages || [];
                if (olderMessages.length === 0) {
                    this.hasMore = false;
                    this.isLoadingMore = false;
                    return;
                }

                // Prepend older messages vào đầu danh sách
                this.getMessagesData.update((old) => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: [...olderMessages, ...old.homeMessagesData.messages],
                    },
                }));

                this.currentOffset += olderMessages.length;
                this.hasMore = response.metadata?.homeMessagesData?.hasMore ?? false;
                this.isLoadingMore = false;
            },
            error: (error) => {
                console.error('Error loading more messages:', error);
                this.isLoadingMore = false;
            },
        });
    }

    getLastMessageSenderName(sender_id: string, sender_name: string): string {
        if (sender_id === this.currentUserId) return 'Bạn ';
        return sender_name ? sender_name : 'Ai đó';
    }

    /**
     * Helper: Post message, update UI, và broadcast qua socket.
     * Dùng chung cho cả tin nhắn thường và system message (pin/unpin).
     */
    private postAndBroadcastMessage(
        content: string,
        messageType: string,
        replyTo?: string,
        messageTransform?: (msg: any) => any,
    ) {
        this.messagesService
            .postMessage(this.conversationId, this.currentUserId, content, replyTo, messageType)
            .subscribe({

                next: (response) => {
                    this.loading = false;
                    // K được xoá, t fix cái lỗi vô đạo bất lương này 10h liền đấy !!!!!!
                    // OK bro, lỡ xóa có fix lại thì cũng nhanh thôi à -.-
                    response.metadata.newMessage.created_at = new Date().toISOString();
                    response.metadata.newMessage.updated_at = new Date().toISOString();

                    // Cho phép caller tuỳ chỉnh message trước khi thêm vào UI
                    const messageToAdd = messageTransform
                        ? messageTransform(response.metadata.newMessage)
                        : { ...response.metadata.newMessage };

                    // Thêm thông tin người gửi vào tin nhắn trước khi hiển thị lên UI
                    const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                    const newMessage = {
                        ...messageToAdd,
                        sender_name: currentUser.full_name,
                        sender_avatar: currentUser.avatar_url,
                    };

                    this.lastMessageId = newMessage.id;
                    console.log('newMessage', newMessage);
                    console.log('this.lastMessageId', this.lastMessageId);

                    this.messageStatus = 'Đã gửi';
                    this.updateUIWithNewMessage(newMessage);
                },
                error: (error) => {
                    this.loading = false;
                    console.error('Error posting message:', error);
                    this.error = error.message;

                    // Thêm thông tin người gửi vào tin nhắn trước khi hiển thị lên UI
                    const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                    const newMessage = {
                        content: content,
                        created_at: new Date().toISOString(),
                        sender_id: this.currentUserId,
                        sender_name: currentUser.full_name,
                        sender_avatar: currentUser.avatar_url,
                    };
                    this.messageStatus = 'Lỗi';
                    this.updateUIWithNewMessage(newMessage);
                },
            });
    }

    updateUIWithNewMessage(newMessage: any, conversationId?: string) {
        // cập nhật lastMessage
        if (!conversationId) conversationId = this.conversationId;
        this.conversationService.putConversation(conversationId, {
            last_message_id: newMessage.id
        }).subscribe({
            next: () => { /* Conversation updated */ },
            error: (err) => console.error('Error updating conversation:', err),
        });

        // không cập nhật nội dung trò chuyện nếu đang ở conversation khác
        if (this.conversationId === conversationId) {
            this.getMessagesData.update((old) => ({
                ...old,
                homeMessagesData: {
                    ...old.homeMessagesData,
                    messages: [...old.homeMessagesData.messages, newMessage],
                },
            }))
        }

        // cập nhật UI của người nhận
        this.lastMessageId = newMessage.id;
        this.socketService.emit('sendMessage', newMessage);
        this.socketService.emit('updateConversation', newMessage);
    }

    handleKeyDown(event: KeyboardEvent) {
        // Chỉ gửi tin nhắn khi Enter (không có Shift)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSendBtn();
        }
        // Nếu Shift+Enter thì cho phép xuống dòng (mặc định của textarea)
    }

    handleSendBtn() {
        if (!this.newMessage.trim()) return;
        const messageContent = this.newMessage;
        const replyTo = this.replyToMessage ? this.replyToMessage.id : undefined;
        this.newMessage = '';
        this.replyToMessage = null;
        this.loading = true;
        this.error = '';

        this.postAndBroadcastMessage(messageContent, 'text', replyTo,
            // Transform: đảm bảo parent_message_info có parent_message_id
            (msg) => ({
                ...msg,
                parent_message_info: msg.parent_message_info
                    ? { ...msg.parent_message_info, parent_message_id: msg.parent_message_id }
                    : null,
            })
        )
    }

    dropdownTop = 0;
    dropdownLeft = 0;

    // Menu methods
    toggleMenu(messageId: string | number, event: MouseEvent) {
        if (this.showMenuId === messageId) {
            this.showMenuId = null;
        } else {
            this.showMenuId = messageId;

            // Tính toán vị trí fixed
            const target = event.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();

            const dropdownHeight = 160;
            const dropdownWidth = 140;

            // X-Axis Left/Right logic
            const isMeRow = target.closest('.me-row');
            let leftPosition = 0;
            if (isMeRow) {
                // Nhắn của mình: Menu nằm bên trái nút
                leftPosition = rect.left - dropdownWidth - 8;
            } else {
                // Nhắn của người khác: Menu nằm bên phải nút
                leftPosition = rect.right + 8;
            }
            // Chống tràn ngang 
            if (leftPosition + dropdownWidth > window.innerWidth) {
                leftPosition = window.innerWidth - dropdownWidth - 10;
            }
            if (leftPosition < 10) leftPosition = 10;

            // Y-Axis Top/Bottom logic
            let topPosition = rect.top + 4; // Căn hơi thụt xuống chút xíu so với nút
            // Chống bị lấp bởi khung chat dưới cùng
            if (topPosition + dropdownHeight > window.innerHeight) {
                topPosition = window.innerHeight - dropdownHeight - 60; // Thụt lên cao hơn vạch input
            }

            this.dropdownTop = topPosition;
            this.dropdownLeft = leftPosition;
        }
    }

    closeMenu() {
        setTimeout(() => {
            this.showMenuId = null;
        }, 250);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (
            !target.closest('.message-actions') &&
            !target.closest('.emoji-picker-wrap') &&
            !target.closest('.messenger-input-icon')
        ) {
            this.closeMenu();
        }
        // Đóng emoji picker chỉ khi click thực sự bên ngoài picker và nút toggle
        if (
            !target.closest('.emoji-picker-wrap') &&
            !target.closest('.emoji-btn')
        ) {
            this.showEmojiPicker = false;
        }

        // Close pinned dropdown when clicking outside
        if (this.showPinnedDropdown && !target.closest('.pinned-bar-wrap')) {
            this.showPinnedDropdown = false;
        }

        // Close pinned context menu when clicking outside
        if (this.openPinnedMenuId && !target.closest('.pinned-menu-wrap')) {
            this.openPinnedMenuId = null;
        }
    }

    // Kiểm tra xem tin nhắn hiện tại có phải là cuối chuỗi cùng sender hoặc là cuối ngày không
    isLastOfSenderOrDay(i: number, messages: any[]): boolean {
        if (i === messages.length - 1) return true;
        const curr = messages[i];
        const next = messages[i + 1];
        // Nếu khác sender hoặc là system
        if (next.sender_id !== curr.sender_id || next.message_type === 'system') return true;
        // Nếu khác ngày
        if (this.getMessageDate(curr.created_at) !== this.getMessageDate(next.created_at))
            return true;
        return false;
    }

    deleteMessage(msg: any) {
        // có bug
        this.messagesService.deleteMessage(msg.id).subscribe({
            next: (response) => {

                this.getMessagesData.update((old) => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((m: any) => {
                            // Mark the deleted message itself
                            if (m.id === msg.id) {
                                return { ...m, is_deleted: true };
                            }
                            // Update messages that have this deleted message as parent
                            if (
                                m.parent_message_info &&
                                m.parent_message_info.parent_message_id === msg.id
                            ) {
                                return {
                                    ...m,
                                    parent_message_info: {
                                        ...m.parent_message_info,
                                        parent_message_is_deleted: true,
                                    },
                                };
                            }
                            return m;
                        }),
                    },
                }));

                const currentUser =
                    this.getMessageInfor?.participants.find(
                        (p: any) => p.user_id === this.currentUserId,
                    ) || {};
                const newMessage = {
                    ...response.metadata.deleteResult,
                    sender_name: currentUser.full_name,
                    sender_avatar: currentUser.avatar_url,
                };
                this.socketService.emit('deleteMessage', newMessage);
                console.log('newMessage: ', newMessage);
                console.log('this.lastMessageId', this.lastMessageId);
                if (newMessage.id === this.lastMessageId) {
                    console.log('Last message deleted');
                    this.socketService.emit('updateConversation', newMessage);
                }
            },
            error: (error) => {
                console.error('Error deleting message:', error);
                this.error = error.message;
            },
        });

        this.closeMenu();
    }

    forwardMessage(msg: any) {
        console.log('Chuyển tiếp tin nhắn:', msg);
        this.closeMenu();
    }

    pinMessage(msg: any) {
        this.messagesService.pinMessage(msg.id, this.conversationId, this.currentUserId, msg.content, 1).subscribe({
            next: (response) => {
                const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                const newPinMessage = {
                    ...response.metadata.newPinMessage,
                    pinned_by_name: currentUser.full_name,
                    sender_name: currentUser.full_name,
                    sender_id: currentUser.user_id,
                    sender_avatar: currentUser.avatar_url,
                    // Gắn thêm content của message gốc để hiển thị
                    content: msg.content,
                };

                // Cập nhật local state ngay lập tức
                this.pinnedMessages.update(prev => [...prev, newPinMessage]);

                // Broadcast cho người khác trong conversation
                this.socketService.emit('pinMessage', newPinMessage);

                const messageContent = "đã ghim tin nhắn: " + newPinMessage.content;
                const message_type = 'system';

                this.postAndBroadcastMessage(messageContent, message_type);
            },
            error: (error) => {
                console.error('Lỗi khi ghim tin nhắn:', error);
            }
        });
        this.closeMenu();
    }

    // Modal sửa tin nhắn
    editingMessage: string = '';
    editingContent: string = '';

    openEditModal(msg: any) {
        this.editingMessage = msg.id;
        this.editingContent = msg.content;
        this.closeMenu();
    }

    closeEditModal() {
        this.editingMessage = '';
        this.editingContent = '';
    }

    saveEditModal() {
        if (this.editingMessage && this.editingContent.trim() !== '') {
            // Lưu vào local variable để tránh bị clear
            const messageId = this.editingMessage;
            const messageContent = this.editingContent;

            this.messagesService.putMessage(messageId, messageContent).subscribe({
                next: (response) => {
                    this.getMessagesData.update((old) => ({
                        ...old,
                        homeMessagesData: {
                            ...old.homeMessagesData,
                            messages: old.homeMessagesData.messages.map((msg: any) => {
                                if (msg.id === messageId) {
                                    return {
                                        ...msg,
                                        content: messageContent,
                                        updated_at: new Date().toISOString(),
                                        is_edited: true
                                    };
                                } else if (msg.parent_message_id === messageId) {
                                    return {
                                        ...msg,
                                        parent_message_info: {
                                            ...msg.parent_message_info,
                                            parent_message_content: messageContent,
                                        },
                                    };
                                } else {
                                    return msg;
                                }
                            }),
                        },
                    }));

                    const currentUser =
                        this.getMessageInfor?.participants.find(
                            (p: any) => p.user_id === this.currentUserId,
                        ) || {};
                    const updatedMsg = this.getMessagesData().homeMessagesData.messages.find(
                        (m: any) => m.parent_message_id === messageId,
                    );
                    const newMessage = {
                        ...response.metadata.updatedMessage,
                        sender_name: currentUser.full_name,
                        sender_avatar: currentUser.avatar_url,
                        parent_message_info:
                            updatedMsg?.parent_message_info ||
                            response.metadata.updatedMessage.parent_message_info,
                    };
                    this.socketService.emit('updateMessage', newMessage);

                    if (messageId === this.lastMessageId) {
                        this.socketService.emit('updateConversation', newMessage);
                    }

                    this.closeEditModal();
                },
                error: (error) => {
                    console.error('Error editing message:', error);
                    this.error = error.message;
                    this.closeEditModal();
                },
            });
        } else {
            this.closeEditModal();
        }
    }

    // Scroll methods
    scrollToBottom(smooth: boolean = true) {
        if (this.messagesContent && this.messagesContent.nativeElement) {
            try {
                const element = this.messagesContent.nativeElement;
                if (smooth) {
                    element.scrollTo({
                        top: element.scrollHeight,
                        behavior: 'smooth',
                    });
                } else {
                    element.scrollTop = element.scrollHeight;
                }
            } catch (e) {
                const element = this.messagesContent.nativeElement;
                element.scrollTop = element.scrollHeight;
            }
        }
    }

    isUserNearBottom(): boolean {
        if (!this.messagesContent || !this.messagesContent.nativeElement) return true;

        const element = this.messagesContent.nativeElement;
        const threshold = 10;

        // Với column-reverse: scrollTop = 0 là dưới cùng, scrollTop âm là scroll lên
        // Nếu scrollTop < -150 (scroll lên xa) thì KHÔNG ở gần dưới
        const nearBottom = element.scrollTop >= -threshold;
        return nearBottom;
    }

    onMessagesScroll() {
        this.isNearBottom = this.isUserNearBottom();
        this.showScrollToBottom = !this.isNearBottom;

        if (!this.isNearBottom) {
            this.autoScroll = false;
        }

        if (this.isNearBottom) {
            this.autoScroll = true;
            this.hasNewMessage = false; // Clear new message flag khi scroll xuống cuối
        }

        // Detect scroll to top (với column-reverse, scrollTop rất âm là đang ở trên cùng)
        if (this.messagesContent?.nativeElement) {
            const element = this.messagesContent.nativeElement;
            const scrollThreshold = element.scrollHeight + element.scrollTop - element.clientHeight;

            // Nếu scroll gần đến top (còn 100px nữa là đến top)
            if (scrollThreshold < 100 && this.hasMore && !this.isLoadingMore) {
                this.loadMoreMessages();
            }
        }
    }

    scrollToBottomClicked() {
        this.autoScroll = true;
        this.isNearBottom = true;
        this.showScrollToBottom = false;
        this.hasNewMessage = false; // Clear new message flag
        // Với column-reverse, scroll về 0 là xuống cuối
        if (this.messagesContent?.nativeElement) {
            this.messagesContent.nativeElement.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    }

    // Emoji picker state
    showEmojiPicker = false;

    // Toggle emoji picker
    toggleEmojiPicker() {
        this.showEmojiPicker = !this.showEmojiPicker;
    }

    addEmoji(event: any) {
        this.newMessage += event.emoji.native;
        this.showEmojiPicker = false; // Đóng picker sau khi chọn emoji
        // Focus lại vào input sau khi chọn emoji
        setTimeout(() => {
            if (this.messageInput?.nativeElement) {
                this.messageInput.nativeElement.focus();
            }
        }, 100);
    }

    // Reply state
    replyToMessage: any = null;

    // Khi click nút reply
    replyMessage(msgId: string) {
        this.messageInput?.nativeElement?.focus();
        const messages = this.getMessagesData().homeMessagesData?.messages || [];
        this.replyToMessage = messages.find((m: any) => m.id === msgId);
    }

    // Đóng khung reply
    cancelReply() {
        this.replyToMessage = null;
    }

    // Scroll to specific message and highlight it
    scrollToMessage(messageId: string) {
        if (!messageId) return;

        // Find the message element
        const messageElement = document.getElementById(`message-${messageId}`);
        if (!messageElement) {
            console.warn('Message not found:', messageId);
            return;
        }

        // Clear previous highlight timeout
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
        }

        // Scroll to message with smooth behavior
        messageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });

        // Trigger highlight animation
        this.highlightedMessageId = messageId;

        // Remove highlight after 2 seconds
        this.highlightTimeout = setTimeout(() => {
            this.highlightedMessageId = null;
        }, 2000);
    }

    async openCallWindow({ initializeVideo, callId }: { initializeVideo: boolean, callId: string }) {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'getCallData') {
                const payload = {
                    type: 'sendCallData',
                    conversationType: this.conversationType,
                    conversationId: this.conversationId,
                    userId: this.currentUserId,
                    callId,
                    initializeVideo,
                };

                (event.source as Window)?.postMessage(payload, window.location.origin);

                window.removeEventListener('message', listener);
            }
        };

        window.addEventListener('message', listener);

        const width = 1200,
            height = 700,
            left = window.screen.width / 2 - width / 2,
            top = window.screen.height / 2 - height / 2,
            features = `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`;

        window.open(
            `/call-display`, // url
            'CallWindow', // target
            features,
        );
    }

    handleVoiceCall() {
        this.handleCall('audio');
    }

    handleVideoCall() {
        this.handleCall('video');
    }

    handleCall(media_type: 'video' | 'audio') {
        this.callService.startCall(this.conversationId, this.conversationType, media_type).subscribe({
            next: async (res) => {
                const { userName, userAvatarUrl } = this.authService.getUserInfor();

                const message = {
                    ...res.metadata,
                    sender_name: userName,
                    sender_avatar: userAvatarUrl,
                }
                this.updateUIWithNewMessage(message)
                const callId = message.call.id;
                if (!message || !callId) {
                    console.log('Call is not found');
                    return;
                }

                if (message.call.call_type && message.call.call_type === GROUP_CALL) {
                    this.callService.createLogJoinGroupCall(this.conversationId).subscribe({
                        next: (res) => {
                            const systemMessage = {
                                ...res.metadata,
                                sender_name: userName,
                                sender_avatar: userAvatarUrl,
                            };

                            this.updateUIWithNewMessage(systemMessage)
                        },
                        error: (error) => console.error(error)
                    })
                }

                const initializeVideo = media_type === 'video' ? true : false;
                this.openCallWindow({ initializeVideo, callId });
            },
            error: (error) => console.log(error)
        })
    }

    getCallIcon(callInfo: any): string {
        if (!callInfo) return 'bi bi-telephone-fill call-icon audio';

        const { media_type, status, call_type } = callInfo;

        // Icon cho cuộc gọi video
        if (media_type === 'video') {
            if (status === 'missed' || status === 'declined') {
                return 'bi bi-camera-video-fill call-icon video-missed';
            }
            return 'bi bi-camera-video-fill call-icon video';
        }

        // Icon cho cuộc gọi audio
        if (status === 'missed' || status === 'declined') {
            return 'bi bi-telephone-fill call-icon audio-missed';
        }
        return 'bi bi-telephone-fill call-icon audio';
    }

    getCallMainContent(callInfo: any): string {
        if (!callInfo) return 'Cuộc gọi';

        const { call_type, media_type, status } = callInfo;
        let callMainContent = '';

        if (call_type === 'group') {
            // Cuộc gọi nhóm
            callMainContent = media_type === 'audio'
                ? 'Cuộc gọi thoại nhóm'
                : 'Cuộc gọi video nhóm';
        } else {
            // Cuộc gọi trực tiếp
            if (status === 'completed') {
                callMainContent = media_type === 'audio'
                    ? 'Cuộc gọi thoại'
                    : 'Cuộc gọi video';
            } else if (status === 'missed') {
                callMainContent = 'Cuộc gọi nhỡ';
            } else if (status === 'declined') {
                callMainContent = 'Đã từ chối';
            } else if (status === 'cancelled') {
                callMainContent = 'Đã hủy';
            } else {
                callMainContent = media_type === 'audio'
                    ? 'Cuộc gọi thoại'
                    : 'Cuộc gọi video';
            }
        }

        return callMainContent;
    }

    getCallDescription(callInfo: any): string {
        if (!callInfo) return '';

        // Nếu có thời lượng cuộc gọi
        if (callInfo.duration_seconds && callInfo.duration_seconds > 0) {
            return this.formatCallDuration(callInfo.duration_seconds);
        }

        // Nếu không có thời lượng, hiển thị thời gian tạo
        if (callInfo.started_at) {
            return this.formatTime(callInfo.started_at);
        }

        return '';
    }

    // Format call duration (seconds to mm:ss or HH:mm:ss)
    formatCallDuration(durationSeconds: number): string {
        if (!durationSeconds || durationSeconds <= 0) return '00:00';

        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

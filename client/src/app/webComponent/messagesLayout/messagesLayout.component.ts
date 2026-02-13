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
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Conversation } from '../../services/conversation';
import { Messages } from '../../services/messages';
import { SocketService } from '../../services/socket';
import { WebRtcService } from '../../services/webRTCService';

@Component({
    selector: 'messages-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './messagesLayout.component.html',
    styleUrls: ['./messagesLayout.component.css'],
})
export class MessagesLayoutComponent
    implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy
{
    protected readonly title = signal('client');

    getMessagesData = signal<any>({});

    loading = false;
    error = '';
    newMessage: string = '';

    @Input() conversationId: string = '';
    @Input() conversationType: string = '';
    @Input() currentUserId: any = {};
    @Input() getMessageInfor: any = {};

    @ViewChild('messagesContent') messagesContent!: ElementRef<HTMLDivElement>;

    autoScroll = true;
    isNearBottom = true;
    showScrollToBottom = false;
    isLoaded = false;
    hasNewMessage = false; // Track new messages when scrolled up

    private scrollTimeout: any;
    private lastConversationId: string = ''; // Track conversation changes
    private pendingScroll = false; // Flag to scroll in ngAfterViewChecked

    // Menu state
    showMenuId: string | number | null = null;

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
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const msgDate = new Date(isoStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (msgDate.toDateString() === today.toDateString()) {
            return 'Hôm nay';
        } else if (msgDate.toDateString() === yesterday.toDateString()) {
            return 'Hôm qua';
        } else {
            const options: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            };
            return msgDate.toLocaleDateString('vi-VN', options);
        }
    }

    // Format time as HH:mm
    formatTime(dateStr: string): string {
        if (!dateStr) return '';
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const date = new Date(isoStr);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    constructor(
        private messagesService: Messages,
        private conversationService: Conversation,
        private router: ActivatedRoute,
        private socketService: SocketService,
    ) {}

    reloadMessages(conversationId: string) {
        this.socketService.emit('joinConversation', conversationId);
        this.socketService.on('newMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                console.log('New message received in conversation', conversationId, ':', data);
                this.getMessagesData.update((old) => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: [...old.homeMessagesData.messages, data],
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
        });
    }

    ngOnInit() {
        if (!this.isLoaded) {
            this.isLoaded = true;
            this.loadMessages(this.conversationId);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        this.reloadMessages(this.conversationId);

        console.log('message info', this.getMessageInfor);
        this.isLoaded = true;

        if (changes['conversationId']) {
            const newConversationId = changes['conversationId'].currentValue;
            this.conversationId = newConversationId;
            this.loadMessages(newConversationId);
            this.socketService.emit('joinConversation', newConversationId);
        }
    }

    ngAfterViewInit() {
        // Scroll xuống dưới cùng sau khi view được khởi tạo
    }

    ngAfterViewChecked() {
        if (this.pendingScroll && this.messagesContent?.nativeElement) {
            this.messagesContent.nativeElement.scrollTop = 0;
            this.pendingScroll = false;
        }
    }

    ngOnDestroy() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        // Cleanup socket listener để tránh memory leak
        this.socketService.off('newMessage');
    }

    loadMessages(conversationId: string) {
        this.loading = true;
        this.messagesService.getMessages(conversationId).subscribe({
            next: (response) => {
                this.getMessagesData.set(response.metadata || {});
                this.loading = false;
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
        this.loading = true;
        this.error = '';
        this.messagesService
            .postMessage(this.conversationId, this.currentUserId, messageContent)
            .subscribe({
                next: (response) => {
                    this.loading = false;
                    this.newMessage = '';
                    console.log('Message sent successfully:', response);
                    this.conversationService
                        .putConversation(this.conversationId, { lastMessage: response.metadata.id })
                        .subscribe({
                            next: (res) => {
                                /* Conversation updated */
                            },
                            error: (err) => {
                                console.error('Error updating conversation:', err);
                            },
                        });
                    this.getMessagesData.update((old) => ({
                        ...old,
                        homeMessagesData: {
                            ...this.getMessagesData().homeMessagesData,
                            messages: [
                                ...this.getMessagesData().homeMessagesData.messages,
                                response.metadata.newMessage,
                            ],
                        },
                    }));
                    const currentUser =
                        this.getMessageInfor?.participants.find(
                            (p: any) => p.user_id === this.currentUserId,
                        ) || {};
                    const newMessage = {
                        ...response.metadata.newMessage,
                        sender_name: currentUser.full_name,
                        sender_avatar: currentUser.avatar_url,
                    };
                    this.socketService.emit('sendMessage', newMessage);
                    this.socketService.emit('updateConversation', newMessage);
                    console.log('New message added2:', newMessage);
                },
                error: (error) => {
                    this.loading = false;
                    console.error('Error sending message:', error);
                    this.error = error.message;
                    this.newMessage = messageContent;
                },
            });
    }

    // Menu methods
    toggleMenu(messageId: string | number) {
        this.showMenuId = this.showMenuId === messageId ? null : messageId;
    }

    closeMenu() {
        this.showMenuId = null;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.message-actions')) {
            this.closeMenu();
        }
    }

    deleteMessage(msg: any) {
        this.messagesService.deleteMessage(msg.id).subscribe({
            next: (response) => {
                this.loadMessages(this.conversationId);
            },
            error: (error) => {
                console.error('Error deleting message:', error);
                this.error = error.message;
            },
        });
        console.log('Gỡ tin nhắn:', msg);
        this.closeMenu();
    }

    forwardMessage(msg: any) {
        console.log('Chuyển tiếp tin nhắn:', msg);
        this.closeMenu();
    }

    pinMessage(msg: any) {
        console.log('Ghim tin nhắn:', msg);
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
            this.messagesService.putMessage(this.editingMessage, this.editingContent).subscribe({
                next: (response) => {
                    this.loadMessages(this.conversationId);
                },
                error: (error) => {
                    console.error('Error editing message:', error);
                    this.error = error.message;
                },
            });
        }
        this.closeEditModal();
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
        console.log('scrollTop:', element.scrollTop, 'nearBottom:', nearBottom);
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

    webRTCService = inject(WebRtcService);
    async openCallWindow({ initializeVideo }: { initializeVideo: boolean }) {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'getCallData') {
                const payload = {
                    type: 'sendCallData',
                    conversationType: this.conversationType,
                    conversationId: this.conversationId,
                    userId: this.currentUserId,
                    offer: null,
                    initializeVideo
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
        this.openCallWindow({initializeVideo: false})
    }

    handleVideoCall() {
        this.openCallWindow({initializeVideo: true})
    }
}

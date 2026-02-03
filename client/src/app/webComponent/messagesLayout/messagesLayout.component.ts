import { Component, signal, OnInit, Input, ViewContainerRef, OnChanges, SimpleChanges, HostListener, ElementRef, ViewChild, AfterViewInit, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Messages } from '../../services/messages';
import { Conversation } from '../../services/conversation';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket';

@Component({
    selector: 'messages-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './messagesLayout.component.html',
    styleUrls: ['./messagesLayout.component.css']
})
export class MessagesLayoutComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
    protected readonly title = signal('client');

    getMessagesData = signal<any>({});

    loading = false;
    error = '';
    newMessage: string = '';

    @Input() conversationId: string = '';
    @Input() currentUserId: any = {};
    @Input() getMessageInfor: any = {};
    
    @ViewChild('messagesContent') messagesContent!: ElementRef<HTMLDivElement>;
    
    autoScroll = true;
    isNearBottom = true;
    showScrollToBottom = false;
    isLoaded = false;
    hasNewMessage = false; // Track new messages when scrolled up
    
    // Pagination state
    hasMore = true; // Còn tin nhắn cũ hơn để load
    isLoadingMore = false; // Đang load thêm tin nhắn
    currentOffset = 0; // Vị trí hiện tại (số messages đã load)
    
    private scrollTimeout: any;
    private lastConversationId: string = ''; // Track conversation changes
    private pendingScroll = false; // Flag to scroll in ngAfterViewChecked
    
    // Cache để tránh tính toán lặp lại
    private dateCache = new Map<string, string>();
    private timeCache = new Map<string, string>();

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
            const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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

    constructor(private messagesService: Messages, 
                private conversationService: Conversation,
                private router: ActivatedRoute, 
                private socketService: SocketService) {}

    // TrackBy function để tối ưu rendering
    trackByMessageId(index: number, message: any): any {
        return message.id;
    }

    setupSocketListener(conversationId: string) {
        this.socketService.emit('joinConversation', conversationId);
        
        // Setup listener cho tin nhắn mới (chỉ setup 1 lần)
        this.socketService.on('newMessage', (data: any) => {
            if (data.conversation_id === conversationId) {
                console.log('New message received in conversation', conversationId, ':', data);
                this.getMessagesData.update(old => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: [
                            ...old.homeMessagesData.messages,
                            data
                        ]
                    }
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
            this.setupSocketListener(this.conversationId);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        console.log('message info', this.getMessageInfor);
        this.isLoaded = true;
        
        if (changes['conversationId']) {
            const newConversationId = changes['conversationId'].currentValue;
            const oldConversationId = changes['conversationId'].previousValue;
            
            // Chỉ xử lý khi thực sự thay đổi conversation
            if (newConversationId !== oldConversationId) {
                this.conversationId = newConversationId;
                
                // Cleanup socket listener cũ
                this.socketService.off('newMessage');
                
                // Load messages và setup socket mới
                this.loadMessages(newConversationId);
                this.setupSocketListener(newConversationId);
            }
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
            }
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
                this.getMessagesData.update(old => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: [
                            ...olderMessages,
                            ...old.homeMessagesData.messages
                        ]
                    }
                }));
                
                this.currentOffset += olderMessages.length;
                this.hasMore = response.metadata?.homeMessagesData?.hasMore ?? false;
                this.isLoadingMore = false;
            },
            error: (error) => {
                console.error('Error loading more messages:', error);
                this.isLoadingMore = false;
            }
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
        this.newMessage = '';
        this.loading = true;
        this.error = '';
        this.messagesService.postMessage(this.conversationId, this.currentUserId, messageContent).subscribe({
            next: (response) => {
                this.loading = false;
                console.log('Message sent successfully:', response);
                this.conversationService.putConversation(this.conversationId, { lastMessage: response.metadata.id }).subscribe({ next: (res) => { /* Conversation updated */},
                    error: (err) => { console.error('Error updating conversation:', err); } });
                this.getMessagesData.update( old => ({
                    ...old,
                    homeMessagesData: {
                        ...this.getMessagesData().homeMessagesData,
                        messages: [
                            ...this.getMessagesData().homeMessagesData.messages,
                            response.metadata.newMessage,
                        ]
                    },
                }));
                const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
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
            }
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
            }
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
                }
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
                        behavior: 'smooth'
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
                behavior: 'smooth'
            });
        }
    }
}
import { Component, signal, OnInit, Input, ViewContainerRef, OnChanges, SimpleChanges, HostListener, ElementRef, ViewChild, AfterViewInit, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Messages } from '../../services/messages';
import { Conversation } from '../../services/conversation';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

@Component({
    selector: 'messages-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, PickerModule],
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
    @Input() onlineUsers: Set<string> = new Set();
    
    @ViewChild('messagesContent') messagesContent!: ElementRef<HTMLDivElement>;
    @ViewChild('messageInput', { static: false }) messageInput!: ElementRef<HTMLTextAreaElement>;
    
    autoScroll = true;
    isNearBottom = true;
    showScrollToBottom = false;

    // Check if a user is online
    isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
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
    pinnedMessages: any[] = [];

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
        
        this.socketService.emit('joinConversation', conversationId);
        
        // Setup listener cho tin nhắn mới
        this.socketService.on('newMessage', (data: any) => {
            console.log('New message received:', data);
            this.lastMessageId = data.id;
            console.log('Last message id updated to:', this.lastMessageId);
            if (data.conversation_id === conversationId) {
                console.log('Adding message to conversation', conversationId, ':', data);
                
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
                                parent_message_id: data.parent_message_id
                            }
                            : null
                    };

                    this.getMessagesData.update(old => ({
                        ...old,
                        homeMessagesData: {
                            ...old.homeMessagesData,
                            messages: [
                                ...currentMessages,
                                messageToAdd
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
            }
        });
        
        // Setup listener cho cập nhật tin nhắn
        this.socketService.on('updateMessage', (data: any) => {
            // this.lastMessageId = data.id;
            // console.log('Last message id updated to:', this.lastMessageId);
            if (data.conversation_id === conversationId) {
                console.log('Updating message in conversations', data);
                this.getMessagesData.update(old => ({
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
                                        parent_message_content: data.content
                                    }
                                };
                            } else {
                                return msg;
                            }
                        })
                    }
                }));
                console.log('Updated messages:', this.getMessagesData().homeMessagesData.messages);
            }
        });
        
        // Setup listener cho xóa tin nhắn
        this.socketService.on('deleteMessage', (data: any) => {
            this.lastMessageId = data.id;
            console.log('Last message id updated to:', this.lastMessageId);
            if (data.conversation_id === conversationId) {
                this.getMessagesData.update(old => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((m: any) => {
                            // Mark the deleted message itself
                            if (m.id === data.id) {
                                return { ...m, is_deleted: true };
                            }
                            // Update messages that have this deleted message as parent
                            if (m.parent_message_info && m.parent_message_info.parent_message_id === data.id) {
                                return {
                                    ...m,
                                    parent_message_info: {
                                        ...m.parent_message_info,
                                        parent_message_is_deleted: true
                                    }
                                };
                            }
                            return m;
                        })
                    }
                }));
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
        if (this.pendingScroll && this.messagesContent?.nativeElement) {
            this.messagesContent.nativeElement.scrollTop = 0;
            this.pendingScroll = false;
        }
        
        // Auto-focus khi có messages và cần focus
        if (this.needsFocus && this.messageInput?.nativeElement && 
            this.getMessagesData().homeMessagesData?.messages?.length > 0) {
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
    }

    loadMessages(conversationId: string) {
        this.loading = true;
        this.messagesService.getMessages(conversationId).subscribe({
            next: (response) => {
                this.lastMessageId = response.metadata?.homeMessagesData?.last_message_id || '';
                this.getMessagesData.set(response.metadata || {});
                this.pinnedMessages = response.metadata?.homeMessagesData?.pinnedMessages || [];
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
        const replyTo = this.replyToMessage ? this.replyToMessage.id : undefined;
        this.newMessage = '';
        this.replyToMessage = null;
        this.loading = true;
        this.error = '';
        this.messagesService.postMessage(this.conversationId, this.currentUserId, messageContent, replyTo).subscribe({
            next: (response) => {
                this.loading = false;
                response.metadata.newMessage.created_at = new Date().toISOString(); // K được xoá, t fix cái lỗi vô đạo bất lương này 10h liền đấy !!!!!!
                response.metadata.newMessage.updated_at = new Date().toISOString();
        
                console.log('Message sent successfully:', response);
                this.conversationService.putConversation(this.conversationId, { lastMessage: response.metadata.id }).subscribe({ next: (res) => { /* Conversation updated */},
                    error: (err) => { console.error('Error updating conversation:', err); } });
                // Ensure parent_message_info includes parent_message_id
                const messageToAdd = {
                    ...response.metadata.newMessage,
                    // If this is a reply, ensure parent_message_info has parent_message_id
                    parent_message_info: response.metadata.newMessage.parent_message_info 
                        ? {
                            ...response.metadata.newMessage.parent_message_info,
                            parent_message_id: response.metadata.newMessage.parent_message_id
                        }
                        : null
                };

                this.getMessagesData.update( old => ({
                    ...old,
                    homeMessagesData: {
                        ...this.getMessagesData().homeMessagesData,
                        messages: [
                            ...this.getMessagesData().homeMessagesData.messages,
                            messageToAdd,
                        ]
                    },
                }));

                console.log('Updated messages:', this.getMessagesData().homeMessagesData.messages);
                const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                const newMessage = {
                    ...response.metadata.newMessage,
                    parent_message_id: replyTo,
                    parent_message_info: response.metadata.newMessage.parent_message_info || null,
                    sender_name: currentUser.full_name,
                    sender_avatar: currentUser.avatar_url,
                };
                this.lastMessageId = newMessage.id;
                console.log('Last message id updated to:', this.lastMessageId);
                this.socketService.emit('sendMessage', newMessage);
                this.socketService.emit('updateConversation', newMessage);
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
        if (!target.closest('.message-actions') && !target.closest('.emoji-picker-container') && !target.closest('.messenger-input-icon')) {
            this.closeMenu();
            // Đóng emoji picker khi click bên ngoài
            if (!target.closest('.emoji-picker-container') && !target.closest('button[title="Biểu tượng cảm xúc"]')) {
                this.showEmojiPicker = false;
            }
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
        if (this.getMessageDate(curr.created_at) !== this.getMessageDate(next.created_at)) return true;
        return false;
    }

    deleteMessage(msg: any) { // có bug
        this.messagesService.deleteMessage(msg.id).subscribe({
            next: (response) => {
                console.log('Message deleted successfully:', response);
                this.getMessagesData.update(old => ({
                    ...old,
                    homeMessagesData: {
                        ...old.homeMessagesData,
                        messages: old.homeMessagesData.messages.map((m: any) => {
                            // Mark the deleted message itself
                            if (m.id === msg.id) {
                                return { ...m, is_deleted: true };
                            }
                            // Update messages that have this deleted message as parent
                            if (m.parent_message_info && m.parent_message_info.parent_message_id === msg.id) {
                                return {
                                    ...m,
                                    parent_message_info: {
                                        ...m.parent_message_info,
                                        parent_message_is_deleted: true
                                    }
                                };
                            }
                            return m;
                        })
                    }
                }));

                const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                const newMessage = {
                    ...response.metadata.deleteResult,
                    sender_name: currentUser.full_name,
                    sender_avatar: currentUser.avatar_url,
                };
                // this.lastMessageId = newMessage.id;
                console.log('Last message id updated to:', this.lastMessageId);
                console.log('Deleting message:', newMessage);
                this.socketService.emit('deleteMessage', newMessage);

                if (msg.id === this.lastMessageId) {
                    this.socketService.emit('updateConversation', newMessage);
                }   
            },
            error: (error) => {
                console.error('Error deleting message:', error);
                this.error = error.message;
            }
        });
        this.closeMenu();
    }

    forwardMessage(msg: any) {
        console.log('Chuyển tiếp tin nhắn:', msg);
        this.closeMenu();
    }

    pinMessage(msg: any) {
        console.log('Ghim tin nhắn:', msg);
        console.log('Curren user', this.currentUserId);
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
                    this.getMessagesData.update(old => ({
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
                                    console.log('Updating parent message content for message:', msg.id);
                                    console.log('New parent message content:', messageContent);
                                    return {
                                        ...msg,
                                        parent_message_info: {
                                            ...msg.parent_message_info,
                                            parent_message_content: messageContent
                                        }
                                    };
                                } else {
                                    return msg;
                                }
                            })
                        }
                    }));

                    console.log('Message edited successfully:', response);
                    console.log('Updated messages:', this.getMessagesData().homeMessagesData);

                    const currentUser = this.getMessageInfor?.participants.find((p: any) => p.user_id === this.currentUserId) || {};
                    const updatedMsg = this.getMessagesData().homeMessagesData.messages.find((m: any) => m.parent_message_id === messageId);
                    const newMessage = {
                        ...response.metadata.updatedMessage,
                        sender_name: currentUser.full_name,
                        sender_avatar: currentUser.avatar_url,
                        parent_message_info: updatedMsg?.parent_message_info || response.metadata.updatedMessage.parent_message_info
                    };
                    console.log('Editing message:', newMessage);
                    this.socketService.emit('updateMessage', newMessage);

                    console.log('current edit id: ', messageId);
                    console.log('last message id: ', this.lastMessageId);
                    if (messageId === this.lastMessageId) {
                        this.socketService.emit('updateConversation', newMessage);
                    }

                    this.closeEditModal();
                },
                error: (error) => {
                    console.error('Error editing message:', error);
                    this.error = error.message;
                    this.closeEditModal();
                }
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
            block: 'center' 
        });
        
        // Trigger highlight animation
        this.highlightedMessageId = messageId;
        
        // Remove highlight after 2 seconds
        this.highlightTimeout = setTimeout(() => {
            this.highlightedMessageId = null;
        }, 2000);
    }
}
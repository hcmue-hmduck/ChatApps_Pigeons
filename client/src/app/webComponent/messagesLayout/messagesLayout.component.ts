import { Component, signal, OnInit, Input, ViewContainerRef, OnChanges, SimpleChanges, HostListener, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
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
export class MessagesLayoutComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
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
    
    private scrollTimeout: any;
    private lastConversationId: string = ''; // Track conversation changes

    // Menu state
    showMenuId: string | number | null = null;


    constructor(private messagesService: Messages, 
                private conversationService: Conversation,
                private router: ActivatedRoute, 
                private socketService: SocketService) {}

    reloadMessages(conversationId: string) {
        this.socketService.emit('joinConversation', conversationId);
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

                // Hiển thị badge "new" nếu user đang scroll ở trên
                if (!this.isUserNearBottom()) {
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
                if (isConversationChange && this.messagesContent?.nativeElement) {
                    this.messagesContent.nativeElement.scrollTop = 0;
                    this.lastConversationId = conversationId;
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

    handleSendBtn() {
        if (!this.newMessage.trim()) return;
        
        const messageContent = this.newMessage;
        this.newMessage = '';
        
        this.messagesService.postMessage(this.conversationId, this.currentUserId, messageContent).subscribe({
            next: (response) => {
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
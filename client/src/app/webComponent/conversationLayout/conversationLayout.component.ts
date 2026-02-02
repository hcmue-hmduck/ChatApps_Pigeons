import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesLayoutComponent } from '../messagesLayout/messagesLayout.component';
import { Conversation } from '../../services/conversation';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket';

@Component({
    selector: 'conversation-layout',
    standalone: true,
    imports: [CommonModule, MessagesLayoutComponent],
    templateUrl: './conversationLayout.component.html',
    styleUrls: ['./conversationLayout.component.css']
})

export class ConversationLayoutComponent implements OnInit {
    protected readonly title = signal('client');
    conversations = signal<any>({});

    loading = false;
    error = '';

    getMessageInfor: any = {};

    user_name = '';
    currentUserId : string = ''; 

    constructor(private conversationService: Conversation, 
                private socketService: SocketService,
                private router: ActivatedRoute) {}

    reloadSidebar() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
        // this.loadConversations(this.currentUserId); 
        this.socketService.on('updateConversation', (data: any) => {
            const currentConversations = this.conversations();
            if (currentConversations.homeConversationData) {
                const updatedConversations = currentConversations.homeConversationData.map((conv: any) => {
                    if (conv.conversation_id === data.conversation_id) {
                        return {
                            ...conv,
                            lastMessage: {
                                ...conv.lastMessage,
                                sender_id: data.sender_id,
                                content: data.content
                            }
                        };
                    }
                    return conv;
                });
                this.conversations.set({
                    ...currentConversations,
                    homeConversationData: updatedConversations
                });
            }
        });
    }

    ngOnInit() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';        
        this.loadConversations(this.currentUserId);
        
        // Setup listener 1 lần duy nhất
        // this.socketService.on('updateConversation', (data: any) => {
        //     console.log('updateConversation received:', data);
        //     const currentConversations = this.conversations();
        //     if (currentConversations.homeConversationData) {
        //         const updatedConversations = currentConversations.homeConversationData.map((conv: any) => {
        //             if (conv.conversation_id === data.conversation_id) {
        //                 return {
        //                     ...conv,
        //                     lastMessage: {
        //                         ...conv.lastMessage,
        //                         sender_id: data.sender_id,
        //                         content: data.content
        //                     }
        //                 };
        //             }
        //             return conv;
        //         });
        //         this.conversations.set({
        //             ...currentConversations,
        //             homeConversationData: updatedConversations
        //         });
        //     }
        // });
    }

    ngOnChanges() {
        this.reloadSidebar();
    }

    ngAfterViewInit() {
        this.reloadSidebar();
    }

    ngOnDestroy() {
        // Ngắt kết nối socket khi component bị hủy
        console.log('Destroying ConversationLayoutComponent, disconnecting sockets.');
        this.socketService.off('updateConversation');
        this.socketService.off('newMessage');
    }

    // Trả về tên người gửi last message cho 1 conversation
    getLastMessageSenderName(conv: any): string {
        if (!conv || !conv.lastMessage || (conv.participants.length < 3 && conv.lastMessage.sender_id !== this.currentUserId)) return '';
        if (conv.lastMessage.sender_id === this.currentUserId) return 'Bạn: ';
        const sender = conv.participants.find((p: any) => p.user_id === conv.lastMessage.sender_id);
        return sender && sender.full_name ? sender.full_name + ': ' : 'Ẩn danh';
    }

    getOtherParticipant(conv: any): any {
        if (conv.participants.length !== 2) return null;
        return conv.participants.find((p: any) => p.user_id !== this.currentUserId);
    }

    loadConversations(userId: string) {
        this.loading = true;
        this.conversationService.getConversations(userId).subscribe({
            next: (response) => {
                this.conversations.set(response.metadata || {});
                
                // Join vào TẤT CẢ conversation rooms để nhận update
                if (response.metadata?.homeConversationData) {
                    response.metadata.homeConversationData.forEach((conv: any) => {
                        this.socketService.emit('joinConversation', conv.conversation_id);
                    });
                }
                
                this.loading = false;
            },
            error: (error) => { 
                console.error('Error:', error);
                this.error = error.message;
                this.loading = false;
            }
        });
    }
    
    selectedConversationId : string = '';
    handleConversationID(conv: any) {
        this.socketService.off('newMessage'); // Ngắt kết nối sự kiện cũ trước khi tham gia phòng mới
        // KHÔNG tắt updateConversation vì nó dùng để update sidebar
        
        this.selectedConversationId = conv.conversation_id;
        this.currentUserId = this.currentUserId;
        const selectedConv = this.conversations().homeConversationData?.find((c: any) => c.conversation_id === this.selectedConversationId);
        this.getMessageInfor = {
            title: selectedConv?.title,
            participants: selectedConv?.participants
        };
    }

    createConversation() {

    }

    openSetting() {

    }

    filter() {

    }
}
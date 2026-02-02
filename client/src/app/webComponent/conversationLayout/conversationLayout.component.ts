import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesLayoutComponent } from '../messagesLayout/messagesLayout.component';
import { Conversation } from '../../services/conversation';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket';
import { create } from 'domain';

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
    
    // Format ISO date string to local time string (giờ máy client)
    toLocalTime(dateStr: string): string {
        console.log('toLocalTime input:', dateStr);
        if (!dateStr) return '';
        // Nếu không có Z và có dạng yyyy-mm-dd hh:mm:ss, thêm Z vào cuối
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const date = new Date(isoStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    reloadSidebar() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
        this.socketService.on('updateConversation', (data: any) => {
            console.log('Received updateConversation event:', data);
            const currentConversations = this.conversations();
            if (currentConversations.homeConversationData) {
                // Đưa conversation vừa update lên đầu mảng
                const updatedConversations = [
                    ...currentConversations.homeConversationData
                        .filter((conv: any) => conv.conversation_id === data.conversation_id)
                        .map((conv: any) => ({
                            ...conv,
                            lastMessage: {
                                ...conv.lastMessage,
                                sender_id: data.sender_id,
                                content: data.content,
                                created_at: data.created_at,
                                updated_at: data.updated_at
                            }
                        })),
                    ...currentConversations.homeConversationData
                        .filter((conv: any) => conv.conversation_id !== data.conversation_id)
                ];
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
                console.log('Conversations loaded:', response);
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
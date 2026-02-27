import { Component, signal, OnInit, OnDestroy, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
    styleUrls: ['./conversationLayout.component.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})

export class ConversationLayoutComponent implements OnInit {
    protected readonly title = signal('client');
    conversations = signal<any>({});
    
    // Set để track user online status
    onlineUsers = signal<Set<string>>(new Set());
    
    // Signals để trigger re-render cho các conversation khác nhau
    tick1s = signal(0);   // Cho message <= 60s
    tick60s = signal(0);  // Cho message > 60s và < 1h
    tick3600s = signal(0); // Cho message >= 1h

    private interval1s: any;
    private interval60s: any;
    private interval3600s: any;

    isLoaded = false;
    loading = signal(false);
    error = '';
    isFirstConversationReady = signal(false);

    getMessageInfor: any = {};

    user_name = '';
    currentUserId : string = '';
    
    // Resize sidebar variables
    isResizing = false;
    sidebarWidth = 500; // pixels (default 500px, ~35% of 1440px)

    constructor(private conversationService: Conversation, 
                private socketService: SocketService,
                private router: ActivatedRoute,
                private cdr: ChangeDetectorRef) {
        // Load sidebar width từ localStorage
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            this.sidebarWidth = parseFloat(savedWidth);
        }
    }

    relativeTime(dateStr: string, tick1s: number, tick60s: number, tick3600s: number): string {
        if (!dateStr) return '';
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) {
            isoStr = isoStr.replace(' ', 'T') + 'Z';
        }
        const date = new Date(isoStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // diff in seconds

        // Subscribe vào signal phù hợp để trigger re-render
        if (diff <= 60) {
            const _ = tick1s; // Subscribe to tick1s
            return 'vừa xong';
        }
        if (diff < 3600) {
            const _ = tick60s; // Subscribe to tick60s
            return `${Math.floor(diff / 60)} phút`;
        }
        // Subscribe vào tick3600s cho các message >= 1h
        const _ = tick3600s;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng`;
        return `${Math.floor(diff / 31536000)} năm`;
    }

    reloadSidebar() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
        
        // Lắng nghe danh sách tất cả users đang online khi mới login
        this.socketService.on('onlineUsersList', (userIds: string[]) => {
            console.log('Received online users list:', userIds);
            this.onlineUsers.set(new Set(userIds));
        });
        
        // Lắng nghe sự kiện user status thay đổi
        this.socketService.on('userStatusChanged', (data: { userId: string, status: string }) => {
            const currentOnlineUsers = new Set(this.onlineUsers());
            if (data.status === 'online') {
                currentOnlineUsers.add(data.userId);
            } else {
                currentOnlineUsers.delete(data.userId);
            }
            this.onlineUsers.set(currentOnlineUsers);
        });
        
        
        this.socketService.on('updateConversation', (data: any) => {
            console.log('Received updateConversation event:', data);
            const currentConversations = this.conversations();
            if (currentConversations.homeConversationData?.joinedConversations) {
                // Đưa conversation vừa update lên đầu mảng
                const updatedConversations = [
                    ...currentConversations.homeConversationData.joinedConversations
                        .filter((conv: any) => conv.conversation_id === data.conversation_id)
                        .map((conv: any) => ({
                            ...conv,
                            lastMessage: {
                                ...conv.lastMessage,
                                sender_id: data.sender_id,
                                content: data.content,
                                created_at: data.created_at,
                                updated_at: data.updated_at,
                                is_deleted: data.is_deleted
                            }
                        })),
                    ...currentConversations.homeConversationData.joinedConversations
                        .filter((conv: any) => conv.conversation_id !== data.conversation_id)
                ];
                this.conversations.set({
                    ...currentConversations,
                    homeConversationData: {
                        ...currentConversations.homeConversationData,
                        joinedConversations: updatedConversations
                    }
                });
            }
        });
        console.log('Socket listeners for conversation layout set up.');
    }

    ngOnInit() {
        if (!this.isLoaded) {
            this.isLoaded = true;
            this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
            this.loadConversations(this.currentUserId);
            
            // Emit userOnline event khi user login
            this.socketService.emit('userOnline', this.currentUserId);
        }
    }

    ngAfterViewInit() {
        this.reloadSidebar();
        this.isLoaded = true;
        
        // Áp dụng saved sidebar width ngay lập tức để tránh jump khi resize
        this.updateSidebarWidth();
        
        // Interval 30s cho message mới (giảm tải CPU)
        this.interval1s = setInterval(() => {
            this.tick1s.update(v => v + 1);
            this.cdr.markForCheck(); // Mark for change detection
        }, 30000);
        
        // Interval 5 phút cho message từ 1 phút đến 1 giờ
        this.interval60s = setInterval(() => {
            this.tick60s.update(v => v + 1);
            this.cdr.markForCheck(); // Mark for change detection
        }, 300000);
        
        // Interval 1 giờ cho message >= 1h
        this.interval3600s = setInterval(() => {
            this.tick3600s.update(v => v + 1);
            this.cdr.markForCheck(); // Mark for change detection
        }, 3600000);
    }

    ngOnDestroy() {
        // Ngắt kết nối socket khi component bị hủy
        console.log('Destroying ConversationLayoutComponent, disconnecting sockets.');
        this.socketService.off('updateConversation');
        this.socketService.off('newMessage');
        this.socketService.off('userStatusChanged');
        this.socketService.off('onlineUsersList');
        if (this.interval1s) clearInterval(this.interval1s);
        if (this.interval60s) clearInterval(this.interval60s);
        if (this.interval3600s) clearInterval(this.interval3600s);
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

    // Kiểm tra user có online không
    isUserOnline(userId: string): boolean {
        return this.onlineUsers().has(userId);
    }

    // Kiểm tra conversation có user online không (cho group)
    hasOnlineUser(conv: any): boolean {
        if (!conv.participants) return false;
        return conv.participants.some((p: any) => 
            p.user_id !== this.currentUserId && this.isUserOnline(p.user_id)
        );
    }

    loadConversations(userId: string) {
        this.loading.set(true);
        this.conversationService.getConversations(userId).subscribe({
            next: (response) => {
                console.log('Conversations loaded:', response);
                this.conversations.set(response.metadata || {});
                
                if (response.metadata?.homeConversationData) {
                    // Tự động click vào conversation đầu tiên NGAY LẬP TỨC để tối ưu thời gian hiển thị
                    if (!this.selectedConversationId && response.metadata.homeConversationData.joinedConversations.length > 0) {
                        this.handleConversationID(response.metadata.homeConversationData.joinedConversations[0]);
                    }
                    
                    // Join vào TẤT CẢ conversation rooms để nhận update (chạy sau để không block UI)
                    response.metadata.homeConversationData.joinedConversations.forEach((conv: any) => {
                        this.socketService.emit('joinConversation', conv.conversation_id);
                    });
                }
                
                // Set flag sau khi load xong (bất kể có conversation hay không)
                this.isFirstConversationReady.set(true);
                this.loading.set(false);
            },
            error: (error) => { 
                console.error('Error:', error);
                this.error = error.message;
                this.isFirstConversationReady.set(true); // Set flag cả khi error
                this.loading.set(false);
            }
        });
    }
    
    selectedConversationId : string = '';
    handleConversationID(conv: any) {
        this.socketService.off('newMessage'); // Ngắt kết nối sự kiện cũ trước khi tham gia phòng mới
        
        this.selectedConversationId = conv.conversation_id;
        this.currentUserId = this.currentUserId;
        const selectedConv = this.conversations().homeConversationData.joinedConversations?.find((c: any) => c.conversation_id === this.selectedConversationId);
        
        // Get other participant for direct conversations
        const otherParticipant = selectedConv?.type === 'direct' ? this.getOtherParticipant(selectedConv) : null;
        
        this.getMessageInfor = {
            title: selectedConv?.title,
            participants: selectedConv?.participants,
            user_info: this.conversations().homeConversationData.userInfo,
            type: selectedConv?.type,
            avatar_url: selectedConv?.avatar_url,
            other_participant: otherParticipant
        };

        console.log('Message Infor: ', this.getMessageInfor);
        
        // Đảm bảo flag được set cho các lần click sau
        if (!this.isFirstConversationReady()) {
            this.isFirstConversationReady.set(true);
        }
    }

    createConversation() {

    }

    openSetting() {

    }

    filter() {

    }

    startResize(event: MouseEvent) {
        event.preventDefault();
        this.isResizing = true;
        
        // Ngăn text selection khi đang resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        
        const startX = event.clientX;
        
        // Lấy width thực tế từ DOM thay vì từ biến để tránh jump
        const sidebar = document.querySelector('.conv-panel') as HTMLElement;
        const startWidth = sidebar ? sidebar.offsetWidth : this.sidebarWidth;
        
        const mouseMoveHandler = (e: MouseEvent) => {
            if (this.isResizing) {
                const deltaX = e.clientX - startX;
                const newWidth = startWidth + deltaX;
                
                // Giới hạn width từ 280px đến 60% màn hình
                const maxWidth = window.innerWidth * 0.6;
                if (newWidth >= 280 && newWidth <= maxWidth) {
                    this.sidebarWidth = newWidth;
                    this.updateSidebarWidth();
                }
            }
        };
        
        const mouseUpHandler = () => {
            this.isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // Lưu vào localStorage
            localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());
            
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
    
    private updateSidebarWidth() {
        const sidebar = document.querySelector('.conv-panel') as HTMLElement;
        if (sidebar) {
            sidebar.style.setProperty('width', `${this.sidebarWidth}px`, 'important');
            sidebar.style.setProperty('flex', `0 0 ${this.sidebarWidth}px`, 'important');
        }
    }
}
import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    signal,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesLayoutComponent } from '../messagesLayout/messagesLayout.component';
import { NavigationService } from '../../services/navigation';
import { SocketService } from '../../services/socket';

@Component({
    selector: 'conversation-layout',
    standalone: true,
    imports: [CommonModule, MessagesLayoutComponent],
    templateUrl: './conversationLayout.component.html',
    styleUrls: ['./conversationLayout.component.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationLayoutComponent implements OnChanges {
    // Nhận data từ SidebarComponent (shell cha)
    @Input() conversations: any = {};
    @Input() currentUserId: string = '';
    @Input() onlineUsers: Set<string> = new Set();

    navService = inject(NavigationService);
    cdr = inject(ChangeDetectorRef);

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
    private socketsReady = false;

    constructor(private socketService: SocketService) { }

    ngOnChanges(changes: SimpleChanges) {
        // Khi conversations được load lần đầu, tự chọn conversation đầu tiên hoặc set ready
        if (changes['conversations'] && this.conversations?.homeConversationData) {
            const joined = this.conversations.homeConversationData.joinedConversations || [];
            if (joined.length > 0) {
                if (!this.isFirstConversationReady()) {
                    this.handleConversationID(joined[0]);
                }
            } else {
                if (!this.isFirstConversationReady()) {
                    this.isFirstConversationReady.set(true);
                }
            }

            if (!this.socketsReady) {
                this.socketsReady = true;
                this.setupSocketListeners();
                this.startTimerIntervals();
            }
        }
    }

    ngOnDestroy() {
        this.socketService.off('updateProfile_conv');
        clearInterval(this.interval1s);
        clearInterval(this.interval60s);
        clearInterval(this.interval3600s);
    }

    private setupSocketListeners() {
        // Lắng nghe updateProfile để cập nhật getMessageInfor khi đang chat
        this.socketService.on('updateProfile', (data: any) => {
            if (!this.selectedConversationId) return;
            const convList = this.conversations?.homeConversationData?.joinedConversations || [];
            const selectedConv = convList.find((c: any) => c.conversation_id === this.selectedConversationId);
            if (!selectedConv) return;
            const otherParticipant = selectedConv.type === 'direct' ? this.getOtherParticipant(selectedConv) : null;
            this.getMessageInfor = {
                ...this.getMessageInfor,
                title: selectedConv.title,
                participants: selectedConv.participants,
                other_participant: otherParticipant,
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

    createConversation() { }

    // ── Helpers ────────────────────────────────────────────
    getOtherParticipant(conv: any): any {
        if (conv.participants?.length !== 2) return null;
        return conv.participants.find((p: any) => p.user_id !== this.currentUserId);
    }

    isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
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

    relativeTime(dateStr: string, tick1s: number, tick60s: number, tick3600s: number): string {
        if (!dateStr) return '';
        let isoStr = dateStr;
        if (!isoStr.endsWith('Z') && isoStr.length === 23) isoStr = isoStr.replace(' ', 'T') + 'Z';
        const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
        if (diff <= 60) { const _ = tick1s; return 'vừa xong'; }
        if (diff < 3600) { const _ = tick60s; return `${Math.floor(diff / 60)} phút`; }
        const _ = tick3600s;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng`;
        return `${Math.floor(diff / 31536000)} năm`;
    }
}

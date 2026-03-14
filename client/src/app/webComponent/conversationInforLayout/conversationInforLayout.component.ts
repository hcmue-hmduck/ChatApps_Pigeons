import { Component, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupAvatarLayoutComponent } from '../groupAvatarLayout/groupAvatarLayout.component';

@Component({
    selector: 'app-conversation-infor-layout',
    standalone: true,
    imports: [CommonModule, GroupAvatarLayoutComponent],
    templateUrl: './conversationInforLayout.component.html',
    styleUrls: ['./conversationInforLayout.component.css']
})
export class ConversationInforLayoutComponent {
    @Output() closePanel = new EventEmitter<void>();

    @Input() userInfor: any;
    @Input() conversationInfor: any;
    @Input() currentUserId = '';
    @Input() userPresence: Map<string, { status: string; last_online_at: string | Date }> = new Map();
    @Input() conversationAvatar: string | null = null;
    @Input() tick1s = 0;
    @Input() tick60s = 0;
    @Input() tick3600s = 0;

    get participants(): any[] {
        return this.conversationInfor?.participants || [];
    }

    get isGroupConversation(): boolean {
        return this.conversationInfor?.type === 'group';
    }

    get otherParticipant(): any | null {
        if (this.isGroupConversation) return null;
        return this.conversationInfor?.other_participant || this.participants[0] || null;
    }

    get profileName(): string {
        return this.conversationInfor?.title || this.otherParticipant?.full_name || 'Cuoc tro chuyen';
    }

    get profileAvatar(): string {
        if (this.isGroupConversation) {
            return this.conversationAvatar || this.conversationInfor?.avatar_url || 'https://picsum.photos/seed/group/200/200';
        }
        return this.otherParticipant?.avatar_url || 'https://picsum.photos/seed/user/200/200';
    }

    // Backward-compatible getters for any stale template cache still referencing old names
    get hasGroupAvatar(): boolean {
        return !!(this.isGroupConversation && (this.conversationAvatar || this.conversationInfor?.avatar_url));
    }

    get groupAvatarMembers(): any[] {
        if (!this.isGroupConversation) return [];
        return (this.participants || []).filter((p: any) => !!p?.avatar_url).slice(0, 3);
    }

    get extraGroupAvatarCount(): number {
        if (!this.isGroupConversation) return 0;
        return Math.max(0, this.participants.length - 3);
    }

    get profileStatus(): string {
        if (this.isGroupConversation) {
            const onlineCount = this.participants.filter((p: any) => {
                if (!p?.user_id || p.user_id === this.currentUserId) return false;
                return this.userPresence.get(p.user_id)?.status === 'online';
            }).length;
            return `${this.participants.length} thành viên ${onlineCount > 0 ? ` • ${onlineCount} đang online` : ''}`;
        }

        const targetUserId = this.otherParticipant?.user_id;
        if (!targetUserId) return 'Không có trạng thái';

        const presence = this.userPresence.get(targetUserId);
        if (presence?.status === 'online') return 'Đang hoạt động';

        const lastOnline = this.getUserLastOnlineAt(this.otherParticipant);
        if (!lastOnline) return 'Offline';

        return `Hoạt động ${this.relativeTimeFromNow(lastOnline)} trước`;
    }

    get chatBio(): string {
        return this.otherParticipant?.bio || this.userInfor?.bio || 'Chưa cập nhật mô tả';
    }

    get chatUsername(): string {
        const source = this.otherParticipant?.full_name || this.profileName;
        return `@${(source || 'chat').toLowerCase().replace(/\s+/g, '_')}`;
    }

    get recentMedia(): Array<{ id: number; url: string }> {
        return this.conversationInfor?.recentMedia || [];
    }

    get recentFiles(): Array<{ name: string; size: string; date: string; type: string }> {
        return this.conversationInfor?.recentFiles || [];
    }

    private getUserLastOnlineAt(participant: any): string | Date {
        if (!participant?.user_id) return '';
        const presence = this.userPresence.get(participant.user_id);
        if (presence?.last_online_at) {
            return presence.last_online_at;
        }
        return participant.last_online_at;
    }

    private relativeTimeFromNow(dateInput: string | Date): string {
        const timeToCompare = typeof dateInput === 'string'
            ? new Date(dateInput.endsWith('Z') || dateInput.length !== 23 ? dateInput : dateInput.replace(' ', 'T') + 'Z').getTime()
            : dateInput.getTime();
        if (Number.isNaN(timeToCompare)) return 'gần đây';

        const diff = Math.max(0, Math.floor((Date.now() - timeToCompare) / 1000));
        if (diff <= 60) {
            const _ = this.tick1s;
            return 'vừa xong';
        }
        if (diff < 3600) {
            const _ = this.tick60s;
            return `${Math.floor(diff / 60)} phút`;
        }
        const _ = this.tick3600s;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng`;
        return `${Math.floor(diff / 31536000)} năm`;
    }

    // Accordion States
    sections = signal({
        chatInfo: false,
        customization: false,
        members: false,
        media: true,
        privacy: false
    });

    toggleSection(sectionName: keyof ReturnType<typeof this.sections>) {
        const current = this.sections();
        this.sections.set({
            ...current,
            [sectionName]: !current[sectionName]
        });
    }
}

import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    inject,
    signal,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavigationService, AppView } from '../../services/navigation';
import { AuthService } from '../../services/authService';
import { Conversation } from '../../services/conversation';
import { User } from '../../services/user';
import { SocketService } from '../../services/socket';
import { ConversationLayoutComponent } from '../conversationLayout/conversationLayout.component';
import { RelationshipLayoutComponent } from '../relationshipLayout/relationshipLayout.component';

@Component({
    selector: 'sidebar-component',
    standalone: true,
    imports: [CommonModule, FormsModule, ConversationLayoutComponent, RelationshipLayoutComponent],
    templateUrl: './sidebarComponent.component.html',
    styleUrls: ['./sidebarComponent.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy {
    navService = inject(NavigationService);
    authService = inject(AuthService);
    cdr = inject(ChangeDetectorRef);

    // ── State ──────────────────────────────────────────────
    currentUserId = '';
    userInfo = signal<any>(null);
    conversations = signal<any>({});
    onlineUsers = signal<Set<string>>(new Set());
    loading = signal(false);
    isReady = signal(false);

    showProfileModal = signal(false);
    isEditingProfile = signal(false);
    showChangePassword = signal(false);
    editForm: any = {};
    changePassForm = { oldPass: '', newPass: '', confirmPass: '' };

    private interval1s: any;
    private interval60s: any;
    private interval3600s: any;

    constructor(
        private router: ActivatedRoute,
        private conversationService: Conversation,
        private userService: User,
        private socketService: SocketService,
    ) { }

    ngOnInit() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
        this.authService.setUserInfor(this.currentUserId);
        this.setupSocketListeners();
        this.loadConversations();
        this.socketService.emit('userOnline', this.currentUserId);

        this.interval1s = setInterval(() => this.cdr.markForCheck(), 30000);
        this.interval60s = setInterval(() => this.cdr.markForCheck(), 300000);
        this.interval3600s = setInterval(() => this.cdr.markForCheck(), 3600000);
    }

    ngOnDestroy() {
        this.socketService.off('updateConversation');
        this.socketService.off('newMessage');
        this.socketService.off('userStatusChanged');
        this.socketService.off('onlineUsersList');
        this.socketService.off('updateProfile');
        clearInterval(this.interval1s);
        clearInterval(this.interval60s);
        clearInterval(this.interval3600s);
    }

    // ── Socket Listeners ──────────────────────────────────
    setupSocketListeners() {
        this.socketService.on('onlineUsersList', (userIds: string[]) => {
            this.onlineUsers.set(new Set(userIds));
        });

        this.socketService.on('userStatusChanged', (data: { userId: string; status: string }) => {
            const set = new Set(this.onlineUsers());
            data.status === 'online' ? set.add(data.userId) : set.delete(data.userId);
            this.onlineUsers.set(set);
        });

        this.socketService.on('updateProfile', (data: any) => {
            const cur = this.conversations();
            if (!cur.homeConversationData?.joinedConversations) return;
            const updated = cur.homeConversationData.joinedConversations.map((conv: any) => {
                const updatedParticipants = conv.participants?.map((p: any) =>
                    p.user_id === data.user_id
                        ? { ...p, full_name: data.full_name, avatar_url: data.avatar_url }
                        : p
                );
                const isDirectWithUpdated =
                    conv.type === 'direct' &&
                    data.user_id !== this.currentUserId &&
                    conv.participants?.some((p: any) => p.user_id === data.user_id);
                return {
                    ...conv,
                    participants: updatedParticipants,
                    ...(isDirectWithUpdated && { title: data.full_name }),
                };
            });
            this.conversations.set({
                ...cur,
                homeConversationData: { ...cur.homeConversationData, joinedConversations: updated },
            });
            this.userInfo.set(this.conversations().homeConversationData?.userInfo);
            this.cdr.markForCheck();
        });

        this.socketService.on('updateConversation', (data: any) => {
            const cur = this.conversations();
            if (!cur.homeConversationData?.joinedConversations) return;
            const updated = [
                ...cur.homeConversationData.joinedConversations
                    .filter((c: any) => c.conversation_id === data.conversation_id)
                    .map((c: any) => ({
                        ...c,
                        lastMessage: {
                            ...c.lastMessage,
                            sender_id: data.sender_id,
                            content: data.content,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            is_deleted: data.is_deleted,
                            message_type: data.message_type,
                        },
                    })),
                ...cur.homeConversationData.joinedConversations.filter(
                    (c: any) => c.conversation_id !== data.conversation_id,
                ),
            ];
            this.conversations.set({
                ...cur,
                homeConversationData: { ...cur.homeConversationData, joinedConversations: updated },
            });
        });
    }

    // ── Load Data ─────────────────────────────────────────
    loadConversations() {
        this.loading.set(true);
        this.conversationService.getConversations(this.currentUserId).subscribe({
            next: (response) => {
                this.conversations.set(response.metadata || {});
                this.userInfo.set(response.metadata?.homeConversationData?.userInfo || null);
                const convList = response.metadata?.homeConversationData?.joinedConversations || [];
                convList.forEach((conv: any) =>
                    this.socketService.emit('joinConversation', conv.conversation_id)
                );
                this.isReady.set(true);
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error loading conversations:', error);
                this.isReady.set(true);
                this.loading.set(false);
            },
        });
    }

    // ── Navigation ────────────────────────────────────────
    setView(view: AppView) {
        this.navService.setView(view);
    }

    isActive(view: AppView): boolean {
        return this.navService.activeView() === view;
    }

    // ── Profile Modal ─────────────────────────────────────
    openProfileModal() { this.showProfileModal.set(true); }
    closeProfileModal() { this.showProfileModal.set(false); this.isEditingProfile.set(false); this.showChangePassword.set(false); }
    toggleEditProfile() {
        if (!this.isEditingProfile()) {
            const user = this.userInfo();
            this.editForm = {
                full_name: user?.full_name || '',
                bio: user?.bio || '',
                email: user?.email || '',
                phone_number: user?.phone_number || '',
                birthday: user?.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '',
                gender: user?.gender || '',
            };
        }
        this.isEditingProfile.update(v => !v);
    }
    toggleChangePassword() { this.showChangePassword.update(v => !v); }
    saveProfile() {
        this.userService.updateUser(this.currentUserId, this.editForm).subscribe({
            next: () => {
                this.conversations.update(old => ({
                    ...old,
                    homeConversationData: {
                        ...old.homeConversationData,
                        userInfo: { ...old.homeConversationData.userInfo, ...this.editForm, updated_at: new Date().toISOString() },
                    },
                }));
                this.userInfo.set(this.conversations().homeConversationData?.userInfo);
                const { full_name, avatar_url, updated_at } = this.userInfo();
                this.socketService.emit('updateProfile', { user_id: this.currentUserId, full_name, avatar_url, updated_at });
                this.isEditingProfile.set(false);
            },
            error: (err) => console.error('Error updating profile:', err),
        });
    }
    saveChangePassword() {
        console.log('Changing password:', this.changePassForm);
        this.showChangePassword.set(false);
        this.changePassForm = { oldPass: '', newPass: '', confirmPass: '' };
    }
}

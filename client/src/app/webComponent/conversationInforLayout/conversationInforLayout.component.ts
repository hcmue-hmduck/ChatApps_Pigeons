import { Component, signal, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupAvatarLayoutComponent } from '../groupAvatarLayout/groupAvatarLayout.component';
import { MediaService } from '../../services/media';
import { Friend } from '../../services/friend';
import { Participant } from '../../services/participant';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket';
import { FileUtils } from '../../utils/FileUtils/fileUltils';
import { forkJoin, lastValueFrom } from 'rxjs';
import { Messages } from '../../services/messages';

@Component({
    selector: 'app-conversation-info-layout',
    standalone: true,
    imports: [CommonModule, GroupAvatarLayoutComponent, FormsModule],
    templateUrl: './conversationInforLayout.component.html',
    styleUrls: ['./conversationInforLayout.component.css']
})
export class ConversationInfoLayoutComponent implements OnInit {
    @Output() closePanel = new EventEmitter<void>();

    @Input() userInfor: any;
    @Input() conversationInfor: any;
    @Input() currentUserId = '';
    @Input() userPresence: Map<string, { status: string; last_online_at: string | Date }> = new Map();
    @Input() conversationAvatar: string | null = null;

    imgData = signal<any[]>([]);
    vidData = signal<any[]>([]);
    fileData = signal<any[]>([]);
    linkData = signal<any[]>([]);

    // Image viewer modal state
    isImageViewerOpen = false;
    currentViewerIndex = 0;
    viewerZoom = 1;
    readonly viewerZoomMin = 0.5;
    readonly viewerZoomMax = 3;
    readonly viewerZoomStep = 0.2;
    viewerPanX = 0;
    viewerPanY = 0;
    isViewerDragging = false;
    private viewerDragStartX = 0;
    private viewerDragStartY = 0;
    private viewerPanStartX = 0;
    private viewerPanStartY = 0;

    // Video viewer modal state
    isVideoViewerOpen = false;
    currentVideoIndex = 0;

    // Add Member modal state
    isAddMemberModalOpen = false;
    isLoadingFriends = false;
    friends: any[] = [];
    selectedFriendIds = new Set<string>();
    addMemberSearchQuery = '';
    isAddingMembers = false;
    addMemberError = '';

    mediaService = inject(MediaService);
    friendService = inject(Friend);
    participantService = inject(Participant);
    socketService = inject(SocketService);
    messagesService = inject(Messages);
    fileUtils = inject(FileUtils);
    private cdr = inject(ChangeDetectorRef);

    constructor() { }

    ngOnInit(): void {
        this.loadMediaData();
        this.socketEmitListener();
        // Pre-load friends so Add Member modal opens instantly
        if (this.currentUserId) {
            this.loadFriends();
        }
    }

    socketEmitListener() {
        this.socketService.on('updateConversationInfo', (data: any) => {
            console.log('Update Conversation Info: ', data);

            // Chỉ cập nhật nếu đúng conversation đang hiển thị và có tệp mới
            if (data.conversation_id === this.conversationInfor?.conversation_id && data.upload_file) {
                const newFiles = Array.isArray(data.upload_file) ? data.upload_file : [data.upload_file];

                newFiles.forEach((file: any) => {
                    const mType = file.message_type || file.resource_type;
                    if (mType === 'image') {
                        this.imgData.update(prev => [file, ...prev]);
                    } else if (mType === 'video') {
                        this.vidData.update(prev => [file, ...prev]);
                    } else if (mType === 'raw' || mType === 'file' || mType === 'audio') {
                        this.fileData.update(prev => [file, ...prev]);
                    }
                });
            }
        });
    }

    loadMediaData() {
        const convID = this.conversationInfor?.conversation_id;
        if (!convID) return;

        this.mediaService.getMedia(convID).subscribe((res: any) => {
            const data = res?.metadata?.mediaMesssage;
            if (data) {
                this.imgData.set(data.image || []);
                this.vidData.set(data.video || []);
                this.fileData.set(data.file || []);
                this.linkData.set(data.link || []);
            }
            console.log('Image Data: ', this.imgData());
            console.log('Video Data: ', this.vidData());
            console.log('File Data: ', this.fileData());
            console.log('Link Data: ', this.linkData());
        });
    }

    get participants(): any[] {
        return this.conversationInfor?.participants || [];
    }

    get isGroupConversation(): boolean {
        return this.conversationInfor?.type === 'group';
    }

    get otherParticipant(): any | null {
        if (this.isGroupConversation) return null;
        return this.conversationInfor?.participants.find((p: any) => p.user_id !== this.currentUserId)
    }

    get profileName(): string {
        return this.conversationInfor?.title || this.otherParticipant?.full_name || 'Cuộc trò chuyện';
    }

    get profileAvatar(): string {
        if (this.isGroupConversation) {
            return this.conversationAvatar || this.conversationInfor?.avatar_url;
        }
        return this.otherParticipant?.avatar_url;
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


    // Accordion States
    sections = signal({
        chatInfo: false,
        customization: false,
        members: false,
        image: true,
        video: false,
        file: false,
        link: false,
        privacy: false
    });

    toggleSection(sectionName: keyof ReturnType<typeof this.sections>) {
        const current = this.sections();
        this.sections.set({
            ...current,
            [sectionName]: !current[sectionName]
        });
    }

    // --- Image Viewer Methods ---

    openGallery(index: number) {
        if (this.imgData().length === 0) return;
        this.currentViewerIndex = index;
        this.resetViewerState();
        this.isImageViewerOpen = true;
    }

    private resetViewerState() {
        this.viewerZoom = 1;
        this.viewerPanX = 0;
        this.viewerPanY = 0;
        this.isViewerDragging = false;
    }

    closeImageViewer() {
        this.isImageViewerOpen = false;
        this.resetViewerState();
    }

    get viewerImageUrl(): string {
        const url = this.imgData()[this.currentViewerIndex]?.file_url;
        return this.fileUtils.resolveMediaUrl(url);
    }

    nextImage(event?: Event) {
        event?.stopPropagation();
        if (this.currentViewerIndex < this.imgData().length - 1) {
            this.currentViewerIndex++;
            this.resetViewerState();
        }
    }

    prevImage(event?: Event) {
        event?.stopPropagation();
        if (this.currentViewerIndex > 0) {
            this.currentViewerIndex--;
            this.resetViewerState();
        }
    }

    zoomInViewer(event?: Event) {
        event?.stopPropagation();
        this.viewerZoom = Math.min(
            this.viewerZoomMax,
            Number((this.viewerZoom + this.viewerZoomStep).toFixed(2)),
        );
    }

    zoomOutViewer(event?: Event) {
        event?.stopPropagation();
        this.viewerZoom = Math.max(
            this.viewerZoomMin,
            Number((this.viewerZoom - this.viewerZoomStep).toFixed(2)),
        );

        if (this.viewerZoom <= 1) {
            this.viewerPanX = 0;
            this.viewerPanY = 0;
            this.isViewerDragging = false;
        }
    }

    resetViewerZoom(event?: Event) {
        event?.stopPropagation();
        this.resetViewerState();
    }

    onViewerPointerDown(event: PointerEvent) {
        if (this.viewerZoom <= 1) return;

        event.stopPropagation();
        event.preventDefault();
        this.isViewerDragging = true;
        this.viewerDragStartX = event.clientX;
        this.viewerDragStartY = event.clientY;
        this.viewerPanStartX = this.viewerPanX;
        this.viewerPanStartY = this.viewerPanY;
    }

    onViewerPointerMove(event: PointerEvent) {
        if (!this.isViewerDragging || this.viewerZoom <= 1) return;

        event.stopPropagation();
        event.preventDefault();
        const deltaX = event.clientX - this.viewerDragStartX;
        const deltaY = event.clientY - this.viewerDragStartY;
        this.viewerPanX = this.viewerPanStartX + deltaX;
        this.viewerPanY = this.viewerPanStartY + deltaY;
    }

    onViewerPointerUp(event?: PointerEvent) {
        event?.stopPropagation();
        this.isViewerDragging = false;
    }

    // --- Video Viewer Methods ---

    openVideoGallery(index: number) {
        if (this.vidData().length === 0) return;
        this.currentVideoIndex = index;
        this.isVideoViewerOpen = true;
    }

    closeVideoViewer() {
        this.isVideoViewerOpen = false;
    }

    get viewerVideoUrl(): string {
        const url = this.vidData()[this.currentVideoIndex]?.file_url;
        return this.fileUtils.resolveMediaUrl(url);
    }

    nextVideo(event?: Event) {
        event?.stopPropagation();
        if (this.currentVideoIndex < this.vidData().length - 1) {
            this.currentVideoIndex++;
        }
    }

    prevVideo(event?: Event) {
        event?.stopPropagation();
        if (this.currentVideoIndex > 0) {
            this.currentVideoIndex--;
        }
    }

    openLink(link: string) {
        if (link) {
            window.open(link, '_blank');
        }
    }

    handleAddMember() {
        this.openAddMemberModal();
    }

    loadFriends() {
        if (!this.currentUserId) return;
        this.isLoadingFriends = true;
        this.friendService.getFriendByUserId(this.currentUserId).subscribe({
            next: (res: any) => {
                const rawFriends = res?.metadata?.friends || [];
                // Flatten nested friend object: { friend_id, friend: { full_name, avatar_url... } }
                this.friends = rawFriends.map((f: any) => ({
                    ...f,
                    full_name: f.friend?.full_name || f.full_name || 'Người dùng',
                    avatar_url: f.friend?.avatar_url || f.avatar_url || 'assets/default-avatar.png',
                    email: f.friend?.email || f.email || '',
                    status: f.friend?.status || f.status || 'offline',
                }));
                this.isLoadingFriends = false;
            },
            error: (err) => {
                console.error('Error fetching friends:', err);
                this.isLoadingFriends = false;
            }
        });
    }

    openAddMemberModal() {
        if (!this.currentUserId) return;
        this.addMemberError = '';
        this.selectedFriendIds.clear();
        this.addMemberSearchQuery = '';
        // Filter out current participants on open (in case participants changed)
        this.isAddMemberModalOpen = true;
    }

    closeAddMemberModal() {
        this.isAddMemberModalOpen = false;
        this.selectedFriendIds.clear();
        this.addMemberSearchQuery = '';
        this.addMemberError = '';
    }

    toggleFriendSelection(friendId: string, checked: boolean) {
        if (checked) {
            this.selectedFriendIds.add(friendId);
        } else {
            this.selectedFriendIds.delete(friendId);
        }
    }

    get filteredFriends() {
        const currentParticipantIds = new Set(this.participants.map((p: any) => p.user_id));
        const nonMembers = this.friends.filter(f => !currentParticipantIds.has(f.friend_id));
        if (!this.addMemberSearchQuery.trim()) return nonMembers;
        const query = this.addMemberSearchQuery.toLowerCase();
        return nonMembers.filter(f =>
            f.full_name?.toLowerCase().includes(query) ||
            f.email?.toLowerCase().includes(query)
        );
    }

    submitAddMembers() {
        if (this.selectedFriendIds.size === 0 || this.isAddingMembers) return;

        const convID = this.conversationInfor?.conversation_id;
        if (!convID) return;

        this.isAddingMembers = true;
        this.addMemberError = '';

        const selectedIds = Array.from(this.selectedFriendIds);

        // Batch add all selected users in parallel
        const addRequests = selectedIds.reduce((acc: any, userId) => {
            acc[userId] = this.participantService.postParticipant({
                conversation_id: convID,
                user_id: userId,
                role: 'member'
            });
            return acc;
        }, {});

        forkJoin(addRequests).subscribe({
            next: async () => {
                this.isAddingMembers = false;

                const allParticipantIds = [
                    ...this.participants.map((p: any) => p.user_id),
                    ...selectedIds
                ];

                // 1. Tạo system message cho từng người và lưu vào DB trước
                try {
                    const systemMessageRequests = selectedIds.map(addedUserId => 
                        lastValueFrom(this.messagesService.postMessage(
                            convID,
                            addedUserId,
                            'đã được thêm vào nhóm',
                            undefined,
                            'system'
                        ))
                    );

                    const savedMessages = await Promise.all(systemMessageRequests);

                    // 2. Sau khi đã lưu tin nhắn vào DB, emit addMember để mọi người (bao gồm mình) refresh sidebar
                    this.socketService.emit('addMember', {
                        conversation_id: convID,
                        added_user_ids: selectedIds,
                        added_by: this.currentUserId,
                        all_participant_ids: allParticipantIds,
                    });

                    // 3. Emit sendMessage để message list hiện tin nhắn ngay lập tức
                    savedMessages.forEach(response => {
                        const savedMsg = response.metadata?.newMessage;
                        if (savedMsg) {
                            const person = this.friends.find((f: any) => String(f.friend_id) === String(savedMsg.sender_id));
                            if (person) {
                                savedMsg.sender_name = person.full_name;
                                savedMsg.sender_avatar = person.avatar_url;
                            }
                            this.socketService.emit('sendMessage', savedMsg);
                        }
                    });

                    // 4. Notify người dùng mới được thêm về conversation
                    this.socketService.emit('notifyNewConversation', {
                        receiverIds: selectedIds,
                        conversationId: convID,
                    });
                } catch (err) {
                    console.error('Error in member addition flow:', err);
                }

                this.closeAddMemberModal();
            },
            error: (err) => {
                console.error('Error adding members:', err);
                this.addMemberError = 'Gặp lỗi khi thêm thành viên. Vui lòng thử lại.';
                this.isAddingMembers = false;
            }
        });
    }
}

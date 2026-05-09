import { Component, signal, Output, EventEmitter, Input, OnInit, OnDestroy, inject, ChangeDetectorRef, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupAvatarLayoutComponent } from '../groupAvatarLayout/groupAvatarLayout.component';
import { MediaService } from '../../services/media';
import { Friend } from '../../services/friend';
import { Participant } from '../../services/participant';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket';
import { FileUtils } from '../../utils/FileUtils/fileUltils';
import { ImgVidUtils } from '../../utils/img_vidUtils/img_vidUtils';
import { forkJoin, lastValueFrom } from 'rxjs';
import { Messages } from '../../services/messages';
import Swal from 'sweetalert2';
import { ActiveConversationService } from '../../services/activeConversation.service';
import { MessageStoreService } from '../../services/messageStore.service';
import { Conversation } from '../../services/conversation';
import { UploadService } from '../../services/uploadService';
import { RelationshipStoreService } from '../../services/relationshipStore.service';

@Component({
    selector: 'app-conversation-info-layout',
    standalone: true,
    imports: [CommonModule, GroupAvatarLayoutComponent, FormsModule],
    templateUrl: './conversationInforLayout.component.html',
    styleUrls: ['./conversationInforLayout.component.css']
})
export class ConversationInfoLayoutComponent implements OnInit, OnDestroy, OnChanges {
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

    mediaViewer!: ImgVidUtils;

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
    messageStoreService = inject(MessageStoreService);
    fileUtils = inject(FileUtils);
    activeConversationService = inject(ActiveConversationService);
    conversationService = inject(Conversation);
    uploadService = inject(UploadService);
    relationshipStore = inject(RelationshipStoreService);
    private cdr = inject(ChangeDetectorRef);
    @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
    private onUpdateConversationInfoSocket?: (data: any) => void;

    constructor() {
        this.mediaViewer = new ImgVidUtils(this.fileUtils);
    }

    ngOnInit(): void {
        this.loadMediaData();
        this.socketEmitListener();
        if (this.currentUserId) {
            this.loadFriends();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['conversationInfor'] && !changes['conversationInfor'].isFirstChange()) {
            this.loadMediaData();
            // Reset UI states for the new conversation
            this.mediaShowAll.set({
                image: false,
                video: false,
                file: false,
                link: false
            });
        }

        if (changes['currentUserId'] && !changes['currentUserId'].isFirstChange()) {
            this.loadFriends();
        }
    }

    socketEmitListener() {
        if (this.onUpdateConversationInfoSocket) {
            this.socketService.off('updateConversationInfo', this.onUpdateConversationInfoSocket);
        }

        this.onUpdateConversationInfoSocket = (data: any) => {
            const currentActiveId = this.activeConversationService.activeConversationId() || 
                                    this.conversationInfor?.conversation_id;
                                    
            // So sánh linh hoạt hơn: Kiểm tra ID thật hoặc ID đang active trên store
            if (data.conversation_id === this.conversationInfor?.conversation_id || 
                 data.conversation_id === currentActiveId) {
                
                // Cập nhật title và avatar nếu có
                if (data.title !== undefined) {
                    if (this.conversationInfor) {
                        this.conversationInfor.title = data.title;
                    }
                }
                if (data.avatar_url !== undefined) {
                    if (this.conversationInfor) {
                        this.conversationInfor.avatar_url = data.avatar_url;
                    }
                    this.conversationAvatar = data.avatar_url;
                }
                
                this.cdr.detectChanges();

                // Xử lý file upload nếu có
                if (data.upload_file) {
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
            }
        };

        this.socketService.on('updateConversationInfo', this.onUpdateConversationInfoSocket);
    }

    ngOnDestroy(): void {
        if (this.onUpdateConversationInfoSocket) {
            this.socketService.off('updateConversationInfo', this.onUpdateConversationInfoSocket);
            this.onUpdateConversationInfoSocket = undefined;
        }
    }

    loadMediaData() {
        const convID = this.conversationInfor?.conversation_id;
        if (!convID) return;

        this.mediaService.getMedia(convID).subscribe((res: any) => {
            const data = res?.metadata?.mediaMesssage;
            if (data) {
                const images = data.image || [];
                const videos = data.video || [];
                const files = data.file || [];
                const links = data.link || [];

                this.imgData.set(images);
                this.vidData.set(videos);
                this.fileData.set(files);
                this.linkData.set(links);

                // Auto open sections with data
                this.sections.update(prev => ({
                    ...prev,
                    image: images.length > 0,
                    video: videos.length > 0,
                    file: files.length > 0,
                    link: links.length > 0,
                    members: this.isGroupConversation
                }));
            }
        });
    }

    get participants(): any[] {
        return this.conversationInfor?.participants || [];
    }

    get isGroupConversation(): boolean {
        return this.conversationInfor?.type === 'group';
    }

    get isOwner(): boolean {
        const me = this.participants.find((p: any) => String(p.user_id) === String(this.currentUserId));
        return me?.owner === 'owner';
    }

    get isAdmin(): boolean {
        const me = this.participants.find((p: any) => String(p.user_id) === String(this.currentUserId));
        return me?.owner === 'admin';
    }

    get otherParticipant(): any | null {
        if (this.isGroupConversation) return null;
        return this.conversationInfor?.participants.find((p: any) => p.user_id !== this.currentUserId)
    }

    get isBlocked(): boolean {
        const other = this.otherParticipant;
        if (!other) return false;
        const blockedList = this.relationshipStore.blockedUser();
        return blockedList.some((b: any) => String(b.friend_id || b.id) === String(other.user_id));
    }

    blockUser() {
        const other = this.otherParticipant;
        if (!other) return;

        Swal.fire({
            title: 'Chặn người dùng?',
            text: 'Bạn sẽ không thể nhận tin nhắn từ người này!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Chặn',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ff0055'
        }).then((result) => {
            if (result.isConfirmed) {
                this.relationshipStore.blockUser(this.currentUserId, { id: other.user_id, full_name: other.full_name, avatar_url: other.avatar_url }, 'Bị chặn từ thông tin cuộc trò chuyện');
                Swal.fire('Thành công', 'Đã chặn người dùng', 'success');
            }
        });
    }

    unblockUser() {
        const other = this.otherParticipant;
        if (!other) return;

        const blockedList = this.relationshipStore.blockedUser();
        const blockData = blockedList.find((b: any) => String(b.friend_id || b.id) === String(other.user_id));
        
        if (!blockData || !blockData.block_id) {
            Swal.fire('Lỗi', 'Không tìm thấy thông tin chặn', 'error');
            return;
        }

        Swal.fire({
            title: 'Bỏ chặn người dùng?',
            text: 'Bạn sẽ có thể nhận tin nhắn từ người này!',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Bỏ chặn',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ff0055'
        }).then((result) => {
            if (result.isConfirmed) {
                this.relationshipStore.unblockUser(this.currentUserId, blockData.block_id, other.user_id);
                Swal.fire('Thành công', 'Đã bỏ chặn người dùng', 'success');
            }
        });
    }

    get profileName(): string {
        return this.conversationInfor?.title || this.otherParticipant?.full_name || 'Cuộc trò chuyện';
    }

    get profileAvatar(): string {
        if (this.isGroupConversation) {
            return this.conversationAvatar || this.conversationInfor?.avatar_url || 'assets/AvatarDefault.jpg';
        }
        return this.otherParticipant?.avatar_url || 'assets/AvatarDefault.jpg';
    }

    sections = signal({
        chatInfo: false,
        customization: false,
        members: false,
        image: false,
        video: false,
        file: false,
        link: false,
        privacy: false
    });

    mediaShowAll = signal({
        image: false,
        video: false,
        file: false,
        link: false
    });

    toggleSection(sectionName: keyof ReturnType<typeof this.sections>) {
        const current = this.sections();
        this.sections.set({
            ...current,
            [sectionName]: !current[sectionName]
        });
    }

    toggleMediaShowAll(type: keyof ReturnType<typeof this.mediaShowAll>) {
        const current = this.mediaShowAll();
        this.mediaShowAll.set({
            ...current,
            [type]: !current[type]
        });
    }

    get isImageViewerOpen(): boolean {
        return this.mediaViewer.isOpen && this.mediaViewer.type === 'image';
    }

    get isVideoViewerOpen(): boolean {
        return this.mediaViewer.isOpen && this.mediaViewer.type === 'video';
    }

    get currentViewerIndex(): number {
        return this.mediaViewer.currentIndex;
    }

    get currentVideoIndex(): number {
        return this.mediaViewer.currentIndex;
    }

    get viewerZoom(): number {
        return this.mediaViewer.zoom;
    }

    get viewerZoomMin(): number {
        return this.mediaViewer.zoomMin;
    }

    get viewerZoomMax(): number {
        return this.mediaViewer.zoomMax;
    }

    get isViewerDragging(): boolean {
        return this.mediaViewer.isDragging;
    }

    get viewerPanX(): number {
        return this.mediaViewer.panX;
    }

    get viewerPanY(): number {
        return this.mediaViewer.panY;
    }

    openGallery(index: number) {
        const urls = this.imgData().map(item => item.file_url).filter(Boolean);
        this.mediaViewer.openImageGallery(urls, index);
    }

    closeImageViewer() {
        this.mediaViewer.closeViewer();
    }

    get viewerImageUrl(): string {
        return this.mediaViewer.mediaUrl;
    }

    nextImage(event?: Event) {
        this.mediaViewer.next(event);
    }

    prevImage(event?: Event) {
        this.mediaViewer.prev(event);
    }

    zoomInViewer(event?: Event) {
        this.mediaViewer.zoomIn(event);
    }

    zoomOutViewer(event?: Event) {
        this.mediaViewer.zoomOut(event);
    }

    resetViewerZoom(event?: Event) {
        this.mediaViewer.resetTransform(event);
    }

    onViewerPointerDown(event: PointerEvent) {
        this.mediaViewer.onPointerDown(event);
    }

    onViewerPointerMove(event: PointerEvent) {
        this.mediaViewer.onPointerMove(event);
    }

    onViewerPointerUp(event?: PointerEvent) {
        this.mediaViewer.onPointerUp(event);
    }

    openVideoGallery(index: number) {
        const urls = this.vidData().map(item => item.file_url).filter(Boolean);
        this.mediaViewer.openVideoGallery(urls, index);
    }

    closeVideoViewer() {
        this.mediaViewer.closeViewer();
    }

    get viewerVideoUrl(): string {
        return this.mediaViewer.mediaUrl;
    }

    nextVideo(event?: Event) {
        this.mediaViewer.next(event);
    }

    prevVideo(event?: Event) {
        this.mediaViewer.prev(event);
    }

    openLink(link: string) {
        if (link) {
            window.open(link, '_blank');
        }
    }

    downloadFile(file: any, event?: MouseEvent) {
        this.fileUtils.downloadFile(file, event);
    }

    editNickname(member: any) {
        const currentNickname = member.nick_name || member.full_name;
        Swal.fire({
            title: 'Sửa biệt danh',
            input: 'text',
            inputValue: currentNickname,
            inputPlaceholder: 'Nhập biệt danh mới',
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => {
                if (!value) {
                    return 'Biệt danh không được để trống!';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const newNickname = result.value;
                const participantId = member.id;
                
                if (!participantId) {
                    Swal.fire('Lỗi', 'Không tìm thấy ID người tham gia', 'error');
                    return;
                }

                this.participantService.putParticipant({
                    id: participantId,
                    nick_name: newNickname
                }).subscribe({
                    next: (res: any) => {
                        Swal.fire('Thành công', 'Đã cập nhật biệt danh', 'success');
                        member.nick_name = newNickname;
                        
                        this.socketService.emit('updateParticipant', {
                            conversation_id: this.conversationInfor.conversation_id,
                            user_id: member.user_id,
                            nick_name: newNickname
                        });

                        // Tạo tin nhắn hệ thống
                        let messageContent = '';
                        if (String(member.user_id) === String(this.currentUserId)) {
                            messageContent = `@[${this.currentUserId}] đã đặt biệt danh cho chính mình là "${newNickname}"`;
                        } else {
                            messageContent = `@[${this.currentUserId}] đã đặt biệt danh cho @[${member.user_id}] là "${newNickname}"`;
                        }

                        this.messagesService.postMessage(
                            this.conversationInfor.conversation_id,
                            this.currentUserId,
                            messageContent,
                            undefined,
                            'system'
                        ).subscribe({
                            next: (msgRes: any) => {
                                const savedMsg = msgRes.metadata?.newMessage;
                                if (savedMsg) {
                                    // Thêm vào store cục bộ để hiển thị ngay không cần reload
                                    this.messageStoreService.addMessage(this.conversationInfor.conversation_id, savedMsg);
                                    
                                    this.socketService.emit('sendMessage', savedMsg);
                                    this.socketService.emit('updateConversation', savedMsg);
                                }
                            }
                        });
                    },
                    error: (err) => {
                        Swal.fire('Lỗi', 'Không thể cập nhật biệt danh', 'error');
                    }
                });
            }
        });
    }

    editGroupName() {
        const currentName = this.profileName;
        const conversationId = this.conversationInfor?.conversation_id || this.activeConversationService.activeConversationId();
        
        if (!conversationId) {
            Swal.fire('Lỗi', 'Không tìm thấy ID cuộc trò chuyện', 'error');
            return;
        }

        Swal.fire({
            title: 'Sửa tên nhóm',
            input: 'text',
            inputValue: currentName,
            inputPlaceholder: 'Nhập tên nhóm mới',
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Tên nhóm không được để trống!';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newName = result.value.trim();
                
                Swal.fire({
                    title: 'Đang cập nhật...',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false
                });

                this.conversationService.putConversation(conversationId, { name: newName }).subscribe({
                    next: (res: any) => {
                        Swal.fire('Thành công', 'Đã cập nhật tên nhóm', 'success');
                        
                        if (this.conversationInfor) {
                            this.conversationInfor.title = newName;
                        }
                        
                        this.activeConversationService.updateConversationList({
                            conversation_id: conversationId,
                            title: newName
                        });

                        this.socketService.emit('updateConversationInfo', {
                            conversation_id: conversationId,
                            title: newName
                        });
                        
                        // Tạo tin nhắn hệ thống
                        const messageContent = `@[${this.currentUserId}] đã đổi tên nhóm thành "${newName}"`;
                        this.messagesService.postMessage(
                            conversationId,
                            this.currentUserId,
                            messageContent,
                            undefined,
                            'system'
                        ).subscribe({
                            next: (msgRes: any) => {
                                const savedMsg = msgRes.metadata?.newMessage;
                                if (savedMsg) {
                                    this.messageStoreService.addMessage(conversationId, savedMsg);
                                    this.socketService.emit('sendMessage', savedMsg);
                                    this.socketService.emit('updateConversation', savedMsg);
                                }
                            }
                        });
                        
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        console.error('Failed to update group name:', err);
                        Swal.fire('Lỗi', 'Không thể cập nhật tên nhóm', 'error');
                    }
                });
            }
        });
    }

    disbandGroup() {
        const conversationId = this.conversationInfor?.conversation_id || this.activeConversationService.activeConversationId();
        if (!conversationId) return;

        Swal.fire({
            title: 'Giải tán nhóm?',
            text: 'Nhóm sẽ không thể hoạt động được nữa!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Giải tán',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ff0055'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Đang xử lý...',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false
                });

                this.conversationService.deleteConversation(conversationId).subscribe({
                    next: () => {
                        Swal.fire('Thành công', 'Đã giải tán nhóm', 'success');
                        this.activeConversationService.activeConversationId.set(null);
                    },
                    error: (err) => {
                        console.error('Failed to disband group:', err);
                        Swal.fire('Lỗi', 'Không thể giải tán nhóm', 'error');
                    }
                });
            }
        });
    }

    leaveGroup() {
        const conversationId = this.conversationInfor?.conversation_id || this.activeConversationService.activeConversationId();
        if (!conversationId) return;

        const me = this.participants.find((p: any) => String(p.user_id) === String(this.currentUserId));
        if (!me || !me.id) {
            Swal.fire('Lỗi', 'Không tìm thấy thông tin thành viên của bạn', 'error');
            return;
        }

        Swal.fire({
            title: 'Rời nhóm?',
            text: 'Bạn sẽ không thể tham gia lại trừ khi được mời!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Rời nhóm',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ff0055'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Đang xử lý...',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false
                });

                this.conversationService.updateParticipant(me.id, { is_active: false }).subscribe({
                    next: () => {
                        Swal.fire('Thành công', 'Đã rời nhóm', 'success');
                        this.activeConversationService.activeConversationId.set(null);
                    },
                    error: (err) => {
                        console.error('Failed to leave group:', err);
                        Swal.fire('Lỗi', 'Không thể rời nhóm', 'error');
                    }
                });
            }
        });
    }

    triggerAvatarUpload() {
        this.avatarInput.nativeElement.click();
    }

    onAvatarSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const conversationId = this.conversationInfor?.conversation_id || this.activeConversationService.activeConversationId();
        if (!conversationId) {
            Swal.fire('Lỗi', 'Không tìm thấy ID cuộc trò chuyện', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('files', file);

        Swal.fire({
            title: 'Đang tải lên...',
            didOpen: () => {
                Swal.showLoading();
            },
            allowOutsideClick: false
        });

        this.uploadService.uploadFile(conversationId, formData).subscribe({
            next: (res: any) => {
                const avatarUrl = res?.metadata?.files?.[0]?.url;
                if (avatarUrl) {
                    this.conversationService.putConversation(conversationId, { avatar_url: avatarUrl }).subscribe({
                        next: () => {
                            Swal.fire('Thành công', 'Đã cập nhật ảnh đại diện nhóm', 'success');
                            
                            if (this.conversationInfor) {
                                this.conversationInfor.avatar_url = avatarUrl;
                            }
                            this.conversationAvatar = avatarUrl;
                            
                            this.activeConversationService.updateConversationList({
                                conversation_id: conversationId,
                                avatar_url: avatarUrl
                            });

                            this.socketService.emit('updateConversationInfo', {
                                conversation_id: conversationId,
                                avatar_url: avatarUrl
                            });

                            // Tạo tin nhắn hệ thống
                            const messageContent = `@[${this.currentUserId}] đã đổi ảnh đại diện nhóm`;
                            this.messagesService.postMessage(
                                conversationId,
                                this.currentUserId,
                                messageContent,
                                undefined,
                                'system'
                            ).subscribe({
                                next: (msgRes: any) => {
                                    const savedMsg = msgRes.metadata?.newMessage;
                                    if (savedMsg) {
                                        this.messageStoreService.addMessage(conversationId, savedMsg);
                                        this.socketService.emit('sendMessage', savedMsg);
                                        this.socketService.emit('updateConversation', savedMsg);
                                    }
                                }
                            });
                            
                            this.cdr.detectChanges();
                        },
                        error: (err: any) => {
                            console.error('Error saving avatar:', err);
                            Swal.fire('Lỗi', 'Không thể lưu ảnh đại diện', 'error');
                        }
                    });
                } else {
                    Swal.fire('Lỗi', 'Không nhận được URL ảnh', 'error');
                }
                this.avatarInput.nativeElement.value = '';
            },
            error: (err: any) => {
                console.error('Error uploading avatar:', err);
                Swal.fire('Lỗi', 'Không thể tải ảnh lên', 'error');
                this.avatarInput.nativeElement.value = '';
            }
        });
    }

    removeMember(member: any) {
        Swal.fire({
            title: 'Xác nhận xoá',
            text: `Bạn có chắc muốn xoá ${member.full_name} khỏi cuộc trò chuyện?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xoá',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire('Thông báo', 'Chức năng xoá thành viên đang được phát triển', 'info');
            }
        });
    }

    promoteToAdmin(member: any) {
        this.updateParticipantRole(member, 'admin', 'Đã phong làm Phó nhóm');
    }

    demoteToMember(member: any) {
        this.updateParticipantRole(member, 'member', 'Đã bãi nhiệm Phó nhóm');
    }

    transferOwnership(member: any) {
        Swal.fire({
            title: 'Xác nhận chuyển quyền',
            text: `Bạn có chắc muốn chuyển quyền Trưởng nhóm cho ${member.nick_name || member.full_name}? Bạn sẽ trở thành Phó nhóm.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Chuyển',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                const targetId = member.id || member.participant_id;
                const myParticipant = this.participants.find((p: any) => String(p.user_id) === String(this.currentUserId));
                const myId = myParticipant?.id;

                if (!targetId || !myId) {
                    Swal.fire('Lỗi', 'Không tìm thấy thông tin người tham gia', 'error');
                    return;
                }

                // 1. Chuyển target thành owner
                this.participantService.putParticipant({ id: targetId, role: 'owner' }).subscribe({
                    next: () => {
                        // 2. Chuyển mình thành admin (Phó nhóm)
                        this.participantService.putParticipant({ id: myId, role: 'admin' }).subscribe({
                            next: () => {
                                Swal.fire('Thành công', 'Đã chuyển quyền Trưởng nhóm', 'success');
                                member.owner = 'owner';
                                if (myParticipant) myParticipant.owner = 'admin';

                                // Emit socket cho cả 2
                                this.socketService.emit('updateParticipant', {
                                    conversation_id: this.conversationInfor.conversation_id,
                                    user_id: member.user_id,
                                    owner: 'owner'
                                });
                                this.socketService.emit('updateParticipant', {
                                    conversation_id: this.conversationInfor.conversation_id,
                                    user_id: this.currentUserId,
                                    owner: 'admin'
                                });

                                // Tạo tin nhắn hệ thống
                                const msg = `@[${this.currentUserId}] đã nhường quyền Trưởng nhóm cho @[${member.user_id}]`;
                                this.messagesService.postMessage(
                                    this.conversationInfor.conversation_id,
                                    this.currentUserId,
                                    msg,
                                    undefined,
                                    'system'
                                ).subscribe({
                                    next: (msgRes: any) => {
                                        const savedMsg = msgRes.metadata?.newMessage;
                                        if (savedMsg) {
                                            this.messageStoreService.addMessage(this.conversationInfor.conversation_id, savedMsg);
                                            this.socketService.emit('sendMessage', savedMsg);
                                            this.activeConversationService.updateConversationList(savedMsg);
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    private updateParticipantRole(member: any, role: string, successMessage: string) {
        const participantId = member.id || member.participant_id;
        if (!participantId) {
            Swal.fire('Lỗi', 'Không tìm thấy ID người tham gia', 'error');
            return;
        }

        this.participantService.putParticipant({
            id: participantId,
            role: role
        }).subscribe({
            next: (res: any) => {
                Swal.fire('Thành công', successMessage, 'success');
                member.owner = role; // Cập nhật local
                
                this.socketService.emit('updateParticipant', {
                    conversation_id: this.conversationInfor.conversation_id,
                    user_id: member.user_id,
                    owner: role
                });

                // Tạo tin nhắn hệ thống
                let sysMessContent = '';
                if (role === 'admin') {
                    sysMessContent = `@[${this.currentUserId}] đã bổ nhiệm @[${member.user_id}] làm Phó nhóm`;
                } else if (role === 'member') {
                    sysMessContent = `@[${this.currentUserId}] đã bãi nhiệm Phó nhóm của @[${member.user_id}]`;
                }

                if (sysMessContent) {
                    this.messagesService.postMessage(
                        this.conversationInfor.conversation_id,
                        this.currentUserId,
                        sysMessContent,
                        undefined,
                        'system'
                    ).subscribe({
                        next: (msgRes: any) => {
                            const savedMsg = msgRes.metadata?.newMessage;
                            if (savedMsg) {
                                this.messageStoreService.addMessage(this.conversationInfor.conversation_id, savedMsg);
                                this.socketService.emit('sendMessage', savedMsg);
                                this.activeConversationService.updateConversationList(savedMsg);
                            }
                        }
                    });
                }
            },
            error: (err) => {
                console.error('Lỗi khi cập nhật quyền:', err);
                Swal.fire('Lỗi', 'Không thể cập nhật quyền', 'error');
            }
        });
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
                this.friends = rawFriends.map((f: any) => ({
                    ...f,
                    full_name: f.friend?.full_name || f.full_name || 'Người dùng',
                    avatar_url: f.friend?.avatar_url || f.avatar_url || 'assets/AvatarDefault.jpg',
                    email: f.friend?.email || f.email || '',
                    status: f.friend?.status || f.status || 'offline',
                }));
                this.isLoadingFriends = false;
            },
            error: (err) => {
                this.isLoadingFriends = false;
            }
        });
    }

    openAddMemberModal() {
        if (!this.currentUserId) return;
        this.addMemberError = '';
        this.selectedFriendIds.clear();
        this.addMemberSearchQuery = '';
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

                try {
                    const systemMessageRequests = selectedIds.map(addedUserId =>
                        lastValueFrom(this.messagesService.postMessage(
                            convID,
                            this.currentUserId,
                            `<i class="bi bi-person-plus"></i> @[${this.currentUserId}] đã thêm @[${addedUserId}] vào nhóm`,
                            undefined,
                            'system'
                        ))
                    );

                    const savedMessages = await Promise.all(systemMessageRequests);

                    this.socketService.emit('addMember', {
                        conversation_id: convID,
                        added_user_ids: selectedIds,
                        added_by: this.currentUserId,
                        all_participant_ids: allParticipantIds,
                    });

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

                    this.socketService.emit('notifyNewConversation', {
                        receiverIds: selectedIds,
                        conversationId: convID,
                        conversation_id: convID,
                    });
                } catch (err) { }

                this.closeAddMemberModal();
            },
            error: (err) => {
                this.addMemberError = 'Gặp lỗi khi thêm thành viên. Vui lòng thử lại.';
                this.isAddingMembers = false;
            }
        });
    }
}

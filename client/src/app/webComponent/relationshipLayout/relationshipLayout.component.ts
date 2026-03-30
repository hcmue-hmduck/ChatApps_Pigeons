import { Component, signal, computed, OnChanges, SimpleChanges, Input, ChangeDetectorRef, HostListener, ViewChild, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Friend } from '../../services/friend';
import { FriendRequest } from '../../services/friendrequest';
import { Conversation } from '../../services/conversation';
import { User } from '../../services/user';
import { UserBlock } from '../../services/userBlock';
import { SocketService } from '../../services/socket';
import { FriendsTab, NavigationService } from '../../services/navigation';
import { UserInforModel } from '../userinforModel/userinforModel.component';
import { FileUtils } from '../../utils/FileUtils/fileUltils';

@Component({
    selector: 'relationship-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, UserInforModel],
    templateUrl: './relationshipLayout.component.html',
    styleUrls: ['./relationshipLayout.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelationshipLayoutComponent implements OnChanges, OnInit, OnDestroy {
    protected readonly title = signal('Relationship');
    @Input() currentUserId: string = '';

    currentTab: FriendsTab = 'friends_suggestions';
    currentSort = signal<'asc' | 'desc'>('asc');

    friends = signal<any[]>([]);
    blockedUser = signal<any[]>([]);
    friendRequests = signal<any[]>([]);
    sentRequests = signal<any[]>([]);

    searchKeyword = '';
    searchResults = signal<any[]>([]);
    isSearching = signal(false);
    sendingRequestsIds = new Set<string>();
    friendRequestsIds = new Set<string>(); // Đây là Set chứa sender_id của người gửi yêu cầu kết bạn cho mình
    friendIds = new Set<string>();         // Set chứa friend_id của những người đã là bạn bè
    currentUser = signal<any>(null);

    // Tự động tính toán lại danh sách hiển thị khi friends hoặc currentSort thay đổi
    groupedFriends = computed(() => {
        const rawFriends = this.friends();
        const sortOrder = this.currentSort();
        const grouped = this.groupFriendsByAlphabet(rawFriends);

        // Sắp xếp các nhóm
        grouped.sort((a, b) => {
            return sortOrder === 'asc'
                ? a.letter.localeCompare(b.letter, 'vi-VN')
                : b.letter.localeCompare(a.letter, 'vi-VN');
        });

        // Sắp xếp bạn bè trong từng nhóm
        grouped.forEach(group => {
            group.friends.sort((a, b) => {
                const nameA = a.full_name || '';
                const nameB = b.full_name || '';
                return sortOrder === 'asc'
                    ? nameA.localeCompare(nameB, 'vi-VN')
                    : nameB.localeCompare(nameA, 'vi-VN');
            });
        });

        return grouped;
    });

    loading = false;
    error = '';
    showMoreMenuId: string | null = null;

    private updateProfileListener!: (data: any) => void;

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.friend-more-btn') && !target.closest('.friend-dropdown')) {
            this.showMoreMenuId = null;
        }
    }

    @ViewChild('userProfileModal') userProfileModal!: UserInforModel;

    constructor(
        private friendService: Friend,
        private userService: User,
        private friendRequestService: FriendRequest,
        private conversationService: Conversation,
        private userBlockService: UserBlock,
        private socketService: SocketService,
        private navService: NavigationService,
        private cdr: ChangeDetectorRef,
        public fileUtils: FileUtils
    ) { }

    ngOnInit() {
        this.setupSocketListeners();
        this.currentTab = this.navService.activeFriendsTab();
    }

    ngOnDestroy() {
        // Gỡ bỏ tất cả socket listeners để tránh memory leak và lag máy
        if (this.updateProfileListener) {
            this.socketService.off('updateProfile', this.updateProfileListener);
        }
        this.socketService.off('updateFriend');
        this.socketService.off('sendFriendRequest');
        this.socketService.off('cancelSentRequest');
        this.socketService.off('rejectFriendRequest');
        this.socketService.off('acceptFriendRequest');
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['currentUserId'] && this.currentUserId) {
            this.loadData();
        }
    }

    setTab(tab: FriendsTab) {
        this.currentTab = tab;
        this.navService.setFriendsTab(tab);
    }

    toggleMoreMenu(friendId: string, event: Event) {
        event.stopPropagation();
        this.showMoreMenuId = this.showMoreMenuId === friendId ? null : friendId;
    }

    closeMoreMenu() {
        setTimeout(() => {
            this.showMoreMenuId = null;
        }, 150);
    }

    private updateStatus(userId: string, status: string) {
        // Update friends signal
        this.friends.update(list => list.map(f =>
            (f.friend_id === userId || f.id === userId) ? { ...f, status } : f
        ));

        // Update search results signal
        this.searchResults.update(list => list.map(u =>
            u.id === userId ? { ...u, status } : u
        ));

        this.cdr.markForCheck();
    }

    private setupSocketListeners() {
        this.updateProfileListener = (data: any) => {
            let updated = false;
            const updatedFriends = this.friends().map((friend: any) => {
                if (friend.friend_id === data.id || friend.friend_id === data.user_id) {
                    updated = true;
                    return {
                        ...friend,
                        full_name: data.full_name || friend.full_name,
                        avatar_url: data.avatar_url || friend.avatar_url,
                    };
                }
                return friend;
            });
            let newUser = false;
            const updatedUsers = this.searchResults().map((user: any) => {
                if (user.id === data.id) {
                    updated = true;
                    newUser = true;
                    user.full_name = data.full_name;
                    user.avatar_url = data.avatar_url;
                }
                return user;
            });


            this.friends.set(updatedFriends);

            if (newUser) {
                this.searchResults.set(updatedUsers);
            }

            if (updated) {
                this.cdr.markForCheck();
            }
        };

        // Cleanup trước khi đăng ký để tránh trùng lặp
        if (this.updateProfileListener) {
            this.socketService.off('updateProfile', this.updateProfileListener);
        }
        this.socketService.off('updateFriend');
        this.socketService.off('sendFriendRequest');
        this.socketService.off('cancelSentRequest');
        this.socketService.off('rejectFriendRequest');
        this.socketService.off('acceptFriendRequest');

        this.socketService.on('updateProfile', this.updateProfileListener);

        this.socketService.on('updateFriend', (data: any) => {
            console.log('Received updateFriend event:', data);
            // remover_id is the ID of the person who performed the deletion
            const removerId = data.remover_id;

            this.friends.update((friends: any) => friends.filter((f: any) => {
                const f_id = f.friend_id || f.id;
                return f_id !== removerId;
            }));

            this.friendIds.delete(removerId);
            this.sendingRequestsIds.delete(removerId);
        });

        this.socketService.on('sendFriendRequest', (data: any) => {
            if (data.receiver_id === this.currentUserId) {
                console.log('sendFriendRequestEmit', data);
                this.friendRequestsIds.add(data.sender_id);
                this.friendRequests.update((requests: any) => [...requests, data]);
            }
        });

        this.socketService.on('cancelSentRequest', (data: any) => {
            console.log('cancelSentRequestEmit', data);
            console.log('FR', this.friendRequests());
            this.friendRequests.update((requests: any) => requests.filter((request: any) => request.id !== data));
            this.sentRequests.update((requests: any) => requests.filter((request: any) => request.id !== data));
        });

        this.socketService.on('rejectFriendRequest', (data: any) => {
            this.sentRequests.update((requests: any) => requests.filter((request: any) => request.id !== data.id));
            console.log('rejectFriendRequestEmit', data);
            console.log('SendingRequestsIds', this.sendingRequestsIds);
            this.sendingRequestsIds.delete(data.receiver_id);
        });

        this.socketService.on('acceptFriendRequest', (data: any) => {
            console.log('Received acceptFriendRequest event:', data);
            // Check if we are the person who originally sent this request
            if (data.sender_id === this.currentUserId) {
                this.friendIds.add(data.friend_id);
                this.friends.update((friends: any) => [...friends, data]);
                this.sentRequests.update((requests: any) => requests.filter((r: any) => r.id !== data.request_id));
            }
        });

        this.socketService.on('blockUser', (data: any) => {
            console.log('Received blockUser event:', data);
            if (data.blocked_id === this.currentUserId) {
                this.searchResults.update((results: any) => results.filter((r: any) => r.id !== data.blocker_id));
                this.sentRequests.update((requests: any) => requests.filter((r: any) => r.id !== data.blocker_id));
                this.friendRequests.update((requests: any) => requests.filter((r: any) => r.id !== data.blocker_id));
            }
        });

        this.socketService.on('unblockUser', (data: any) => {
            console.log('Received unblockUser event:', data);
            if (data.blocked_id === this.currentUserId) {
                console.log('blockUser', this.blockedUser());
                this.blockedUser.update((blocks: any) => blocks.filter((b: any) => b.id !== data.blocked_id));
                this.searchResults.update((results: any) => [...results, data]);
            }
        });

        // User Presence Listeners
        this.socketService.on('onlineUsersList', (userIds: string[]) => {
            console.log('[Relationship] Received onlineUsersList:', userIds);
            const onlineSet = new Set(userIds);

            this.friends.update(list => list.map(f => ({
                ...f,
                status: onlineSet.has(f.friend_id || f.id) ? 'online' : 'offline'
            })));

            this.searchResults.update(list => list.map(u => ({
                ...u,
                status: onlineSet.has(u.id) ? 'online' : 'offline'
            })));

            this.cdr.markForCheck();
        });

        this.socketService.on('userStatusChanged', (data: { userId: string, status: string }) => {
            console.log('[Relationship] userStatusChanged:', data);
            this.updateStatus(data.userId, data.status);
        });
    }

    loadData() {
        if (!this.currentUserId) return;
        this.loading = true;
        this.isSearching.set(true);

        forkJoin({
            friends: this.friendService.getFriendByUserId(this.currentUserId),
            requests: this.friendRequestService.getFriendRequestsByUserId(this.currentUserId),
            sentRequests: this.friendRequestService.getSentFriendRequestsByUserId(this.currentUserId),
            blocks: this.userBlockService.getBlockedUserByUserId(this.currentUserId),
            users: this.userService.getAllUsers(),
        }).subscribe({
            next: (res: any) => {
                const allFriendsArr = res.friends?.metadata?.friends || [];
                const receivedRequestsArr = res.requests?.metadata || [];
                const sentRequestsArr = res.sentRequests?.metadata?.sentFriendRequests || [];
                const blocksArr = res.blocks?.metadata?.userBlocks || [];
                const allUsersArr = res.users?.metadata || [];

                console.log('[Relationship] Data loaded:', {
                    friends: allFriendsArr.length,
                    receivedRequests: receivedRequestsArr.length,
                    sentRequests: sentRequestsArr.length,
                    blocks: blocksArr.length,
                    totalUsers: allUsersArr.length
                });

                this.isSearching.set(false);

                // Identify IDs for fast categorization
                const friendIdsSet = new Set<string>(allFriendsArr.map((f: any) => f.friend_id));
                const receivedRequestSenderIds = new Set<string>(receivedRequestsArr.map((r: any) => r.sender_id));
                const sentRequestReceiverIds = new Set<string>(sentRequestsArr.map((r: any) => r.receiver_id));
                const blockedIdsSet = new Set<string>(blocksArr.map((b: any) => b.blocked_id));

                console.log('blockSet', blockedIdsSet);

                this.friendIds = friendIdsSet;
                this.friendRequestsIds = receivedRequestSenderIds;
                this.sendingRequestsIds = sentRequestReceiverIds;

                const suggestions: any[] = [];
                const blockedListExtended: any[] = [];
                let myProfile: any = null;

                allUsersArr.forEach((u: any) => {
                    if (u.id === this.currentUserId) {
                        myProfile = u;
                        return;
                    }

                    // Categorize as blocked if in the blocked set
                    if (blockedIdsSet.has(u.id)) {
                        const blockData = blocksArr.find((b: any) => b.blocked_id === u.id);
                        blockedListExtended.push({
                            ...u,
                            block_id: blockData?.id,
                            reason: blockData?.reason
                        });
                        return;
                    }

                    // Suggestions: users who are NOT current user, NOT blocked, NOT friends, AND no pending requests
                    const isFriend = friendIdsSet.has(u.id);
                    const isRequestSent = sentRequestReceiverIds.has(u.id);
                    const isRequestReceived = receivedRequestSenderIds.has(u.id);

                    if (!isFriend && !isRequestSent && !isRequestReceived) {
                        suggestions.push(u);
                    }
                });

                // Update signals
                const userProfileMap = new Map<string, any>(allUsersArr.map((u: any) => [u.id, u]));

                // Enrich friend list with full profiles
                const enrichedFriends = allFriendsArr.map((f: any) => {
                    const profile = userProfileMap.get(f.friend_id);
                    return {
                        ...f,
                        full_name: profile?.full_name || 'Người dùng Pigeons',
                        avatar_url: profile?.avatar_url || 'assets/default-avatar.png',
                        status: profile?.status || 'offline'
                    };
                });

                // Enrich received requests with sender info
                const enrichedReceivedRequests = receivedRequestsArr.map((req: any) => {
                    const senderProfile = userProfileMap.get(req.sender_id);
                    return {
                        ...req,
                        sender_name: senderProfile?.full_name || 'Người dùng Pigeons',
                        sender_avatar: senderProfile?.avatar_url || 'assets/default-avatar.png',
                        status: senderProfile?.status || 'offline'
                    };
                });

                // Enrich sent requests with receiver info (status is missing from server's enrichment)
                const enrichedSentRequests = sentRequestsArr.map((req: any) => {
                    const receiverProfile = userProfileMap.get(req.receiver_id);
                    return {
                        ...req,
                        receiver_name: receiverProfile?.full_name || req.receiver_name,
                        receiver_avatar: receiverProfile?.avatar_url || req.receiver_avatar,
                        status: receiverProfile?.status || 'offline'
                    };
                });

                console.log('block', blockedListExtended);

                this.currentUser.set(myProfile);
                this.friends.set(enrichedFriends);
                this.blockedUser.set(blockedListExtended);
                this.friendRequests.set(enrichedReceivedRequests);
                this.sentRequests.set(enrichedSentRequests);
                this.searchResults.set(suggestions);

                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error loading data:', error);
                this.error = error.message;
                this.loading = false;
                this.isSearching.set(false);
                this.cdr.detectChanges();
            }
        });
    }


    unblockUser(block_id: string, full_name: string) {
        console.log("block_user", this.blockedUser());
        Swal.fire({
            title: `Bỏ chặn "${full_name}"?`,
            text: 'Bạn có chắc chắn muốn bỏ chặn người này không?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Bỏ chặn',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#3b82f6',
        }).then((result) => {
            if (result.isConfirmed) {
                this.userBlockService.deleteBlockedUser(block_id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Thành công!',
                            text: 'Đã bỏ chặn người dùng.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                        const unblockedUser = this.blockedUser().find(u => u.block_id === block_id);
                        console.log('unblockedUser', unblockedUser);
                        if (unblockedUser) {
                            const dataBlock = {
                                ...unblockedUser,

                                blocker_id: this.currentUserId,
                                blocked_id: unblockedUser.friend_id || unblockedUser.id,
                            }
                            console.log('Emitting unblockUser:', dataBlock);
                            this.socketService.emit('unblockUser', dataBlock);

                            // Refresh data to correctly re-categorize the unblocked user
                            this.loadData();
                        }
                    },
                    error: (error) => {
                        console.error('Error unblocking user:', error);
                        Swal.fire('Lỗi', 'Không thể bỏ chặn người dùng này.', 'error');
                    }
                });
            }
        });
    }

    groupFriendsByAlphabet(friends: any[]): { letter: string, friends: any[] }[] {
        if (!friends || friends.length === 0) return [];

        const groups: { [key: string]: any[] } = {};

        friends.forEach(friend => {
            // Lấy chữ cái đầu tiên, chuyển thành in hoa
            // Xử lý cả trường hợp không có tên hoặc emoji
            let firstLetter = '#';
            if (friend.full_name && friend.full_name.trim().length > 0) {
                const char = friend.full_name.trim().charAt(0).toUpperCase();
                // Bỏ dấu tiếng Việt nếu có để gom nhóm chuẩn (vd: Á -> A, Đ -> D)
                firstLetter = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D');
                // Nếu không phải là chữ cái (A-Z)
                if (!/[A-Z]/.test(firstLetter)) {
                    firstLetter = '#';
                }
            }

            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(friend);
        });

        // Chuyển object { 'A': [...], 'B': [...] } thành mảng và sắp xếp key
        return Object.keys(groups)
            .sort()
            .map(letter => ({
                letter: letter,
                friends: groups[letter]
            }));
    }

    onSortChange(event: any) {
        const option = event.target.value;
        console.log(option);
        this.currentSort.set(option);
    }

    viewProfile(friend_id: string) {
        this.userProfileModal.open(friend_id);
    }

    processFriendRequest(requestId: string, sender_id: string, action: 'accepted' | 'rejected', note: string) {
        console.log('Data:', this.friendRequests());
        // Lấy thông tin người gửi từ request hiện tại để chút nữa gán vào list bạn bè
        const requestInfo = this.friendRequests().find(r => r.id === requestId);

        this.loading = true;

        if (action === 'rejected') {
            this.friendRequestService.updateFriendRequest(requestId, action, note).subscribe({
                next: () => {
                    this.loading = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã từ chối',
                        text: 'Đã từ chối lời mời kết bạn',
                        timer: 1500,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    this.friendRequests.update((requests: any) => requests.filter((r: any) => r.id !== requestId));
                    this.socketService.emit('rejectFriendRequest', requestInfo);
                },
                error: (error) => {
                    console.error('Error processing friend request:', error);
                    this.loading = false;
                }
            });
        } else if (action === 'accepted') {
            const updateRequest$ = this.friendRequestService.updateFriendRequest(requestId, action, note);
            const createFriend$ = this.friendService.createFriend(this.currentUserId, sender_id, true, note);

            forkJoin([updateRequest$, createFriend$]).subscribe({
                next: ([updateRes, createRes]: [any, any]) => {
                    this.loading = false;
                    console.log('Request', requestInfo);
                    const fullFriendData = {
                        ...requestInfo,
                        full_name: requestInfo.sender_name,
                        avatar_url: requestInfo.sender_avatar,
                        // friend_id cần đồng bộ với format của list friends
                        friend_id: sender_id,
                        request_id: requestId,
                    };
                    console.log('Full friend data:', fullFriendData);

                    this.friends.update((friends: any) => [...friends, fullFriendData]);
                    this.friendIds.add(sender_id);
                    this.friendRequestsIds.delete(sender_id);

                    // Xoá khỏi danh sách request
                    this.friendRequests.update((requests: any) => requests.filter((r: any) => r.id !== requestId));
                    Swal.fire({
                        icon: 'success',
                        title: 'Thành công',
                        text: 'Đã chấp nhận lời mời kết bạn',
                        timer: 1500,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
                    const fullFriendData2 = {
                        ...requestInfo,
                        full_name: this.currentUser().full_name,
                        avatar_url: this.currentUser().avatar_url,
                        // This ID will be used by the RECEIVER (the original sender) 
                        // to add the ACCEPTOR (current user) to their friends list.
                        friend_id: this.currentUserId,
                        request_id: requestId,
                    };
                    console.log('Emitting acceptFriendRequest:', fullFriendData2);
                    this.socketService.emit('acceptFriendRequest', fullFriendData2);
                },
                error: (error) => {
                    console.error('Error accepting friend request:', error);
                    this.loading = false;
                }
            });
        }
    }

    blockUser(friend: any) {
        const full_name = friend.full_name;
        const friend_id = friend.friend_id ? friend.friend_id : friend.id;
        console.log('Blocked', friend);
        Swal.fire({
            title: `Chặn "${full_name}"?`,
            text: 'Bạn có chắc chắn muốn chặn người này không? Họ sẽ không thể gửi tin nhắn cho bạn.',
            icon: 'warning',
            input: 'textarea',
            inputPlaceholder: 'Nhập lý do chặn (không bắt buộc)...',
            showCancelButton: true,
            confirmButtonText: 'Chặn',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444',
            inputAttributes: {
                'autocapitalize': 'off',
                'autocorrect': 'off'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const reason = result.value || '';
                console.log(this.currentUserId, friend_id, reason);
                this.userBlockService.createBlockedUser(this.currentUserId, friend_id, reason).subscribe({
                    next: (res) => {
                        console.log(res.metadata.newUserBlock);
                        const blockedUser = {
                            ...friend,
                            block_id: res.metadata.newUserBlock.id,
                            reason: reason
                        }
                        console.log(blockedUser);
                        Swal.fire({
                            title: 'Đã chặn!',
                            text: 'Người dùng này đã bị chặn.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                        this.searchResults.update((results: any) => results.filter((result: any) => (result.friend_id ? result.friend_id !== friend_id : result.id !== friend_id)));
                        this.blockedUser.update((blockedUsers: any) => [...blockedUsers, blockedUser]);
                        const dataBlock = {
                            blocker_id: this.currentUser().id,
                            blocked_id: friend_id,

                        }
                        this.socketService.emit('blockUser', dataBlock);
                    },
                    error: (error) => {
                        console.error('Error blocking user:', error);
                        Swal.fire('Lỗi', 'Không thể chặn người dùng này. Vui lòng thử lại.', 'error');
                    }
                });
            }
        });
    }

    cancelSentRequest(requestId: string) {
        Swal.fire({
            title: 'Hủy lời mời?',
            text: 'Bạn có chắc chắn muốn hủy lời mời kết bạn này?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Có, hủy ngay',
            cancelButtonText: 'Không',
            confirmButtonColor: '#ef4444',
        }).then((result) => {
            if (result.isConfirmed) {
                // Using update with status 'rejected' or similar if delete not available
                // For now, let's just remove it from UI after server response
                this.friendRequestService.updateFriendRequest(requestId, 'rejected', 'Canceled by sender').subscribe({
                    next: () => {
                        this.socketService.emit('cancelSentRequest', requestId);
                        Swal.fire({
                            title: 'Đã hủy',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                    }
                });
            }
        });
    }

    deleteFriend(friend: any) {
        const friend_id = friend.friend_id || friend.id;
        const full_name = friend.full_name;

        Swal.fire({
            title: `Xóa "${full_name}" khỏi danh sách bạn bè?`,
            text: 'Bạn có chắc chắn muốn xóa người này khỏi danh sách bạn bè không?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#ef4444',
        }).then((result) => {
            if (result.isConfirmed) {
                this.friendService.deleteFriend(this.currentUserId, friend_id).subscribe({
                    next: () => {
                        // 1. Update local UI: Remove by friend's ID
                        this.friends.update((friends: any) => friends.filter((f: any) => {
                            const f_id = f.friend_id || f.id;
                            return f_id !== friend_id;
                        }));

                        this.friendIds.delete(friend_id);
                        this.sendingRequestsIds.delete(friend_id);

                        // 2. Notify other users: Tell them WHO removed WHOM
                        this.socketService.emit('updateFriend', {
                            remover_id: this.currentUserId,
                            target_id: friend_id
                        });



                        Swal.fire({
                            title: 'Đã xóa',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                    },
                    error: (error) => {
                        console.error('Error deleting friend:', error);
                    }
                });
            }
        });
    }

    onSearch() {
        if (!this.searchKeyword.trim()) {
            this.searchResults.set([]);
            return;
        }

        this.isSearching.set(true);
        forkJoin({
            results: this.userService.searchUsers(this.searchKeyword),
            sentRequests: this.friendRequestService.getSentFriendRequestsByUserId(this.currentUserId)
        }).subscribe({
            next: (res: any) => {
                const users = (res.results.metadata?.users || []).filter((u: any) => u.id !== this.currentUserId);
                this.searchResults.set(users);

                const sent = res.sentRequests.metadata?.sentFriendRequests || [];
                this.sendingRequestsIds = new Set<string>();
                sent.forEach((req: any) => {
                    if (req.receiver_id) {
                        this.sendingRequestsIds.add(req.receiver_id);
                    }
                });

                this.isSearching.set(false);
            },
            error: (err: any) => {
                console.error('Search error:', err);
                this.isSearching.set(false);
            }
        });
    }

    sendFriendRequest(user: any) {
        const receiverId = user.id;
        if (this.sendingRequestsIds.has(receiverId)) return;

        const defaultMsg = `Mình là ${this.currentUser()?.full_name || 'người quen'}, kết bạn với mình nhé!`;

        Swal.fire({
            title: 'Lời mời kết bạn',
            input: 'textarea',
            inputLabel: 'Tin nhắn làm quen',
            inputValue: defaultMsg,
            inputPlaceholder: 'Nhập lời nhắn...',
            showCancelButton: true,
            confirmButtonText: 'Gửi lời mời',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#00f2ff',
            background: '#0a1622',
            color: '#fff',
            inputAttributes: {
                'style': 'background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.1);'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const note = result.value || '';
                this.friendRequestService.createFriendRequest(this.currentUserId, receiverId, note).subscribe({
                    next: (res) => {
                        console.log('Data send friend request', res.metadata);
                        const newFriendRequest = {
                            id: res.metadata?.id,
                            sender_id: this.currentUserId,
                            receiver_id: receiverId,
                            note: note,
                            status: 'pending',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            sender_name: this.currentUser()?.full_name,
                            sender_avatar: this.currentUser()?.avatar_url,
                            receiver_name: user.full_name,
                            receiver_avatar: user.avatar_url,
                        };
                        this.sentRequests.update((requests: any) => [newFriendRequest, ...requests]);
                        this.sendingRequestsIds.add(receiverId);
                        this.socketService.emit('sendFriendRequest', newFriendRequest);
                        Swal.fire({
                            title: 'Đã gửi!',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                    },
                    error: (err: any) => {
                        console.error('Error sending friend request:', err);
                        this.sendingRequestsIds.delete(receiverId);
                        Swal.fire('Lỗi', 'Không thể gửi lời mời. Vui lòng thử lại.', 'error');
                    }
                });
            }
        });
    }

    isRequestSent(userId: string): boolean {
        return this.sendingRequestsIds.has(userId);
    }

    isFriendRequest(userId: string): boolean {
        return this.friendRequestsIds.has(userId);
    }

    isFriend(userId: string): boolean {
        return this.friendIds.has(userId);
    }

    getReceivedRequest(userId: string): any {
        return this.friendRequests().find(req => req.sender_id === userId);
    }

    sendMessage(receiverId: string) {
        this.conversationService.getConversations(this.currentUserId).subscribe({
            next: (res: any) => {
                const joinedConversations = res.metadata?.homeConversationData?.joinedConversations || [];
                // Tìm cuộc trò chuyện direct đã tồn tại với receiverId
                const existingConv = joinedConversations.find((conv: any) =>
                    conv.type === 'direct' &&
                    conv.participants.some((p: any) => p.user_id === receiverId)
                );

                if (existingConv) {
                    this.navService.openConversation(existingConv.conversation_id);
                } else {
                    this.conversationService.createConversation(receiverId, 'direct', '', '', this.currentUserId, '', '').subscribe({
                        next: (createRes: any) => {
                            const newId = createRes?.metadata?.newConversation?.conv?.id;
                            if (newId) {
                                this.navService.openConversation(newId);
                            }
                        },
                        error: (err: any) => console.error('Error creating conversation:', err)
                    });
                }
            },
            error: (err: any) => {
                console.error('Error checking existing conversations:', err);
                this.conversationService.createConversation(receiverId, 'direct', '', '', this.currentUserId, '', '').subscribe({
                    next: (createRes: any) => {
                        const newId = createRes?.metadata?.newConversation?.conv?.id;
                        if (newId) this.navService.openConversation(newId);
                    }
                });
            }
        });
    }
}
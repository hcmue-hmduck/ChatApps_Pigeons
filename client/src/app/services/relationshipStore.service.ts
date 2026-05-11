import { Injectable, signal, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Friend } from './friend';
import { FriendRequest } from './friendrequest';
import { User } from './user';
import { SearchService } from './searchService';
import { UserBlock } from './userBlock';
import { SocketService } from './socket';
import { ActiveConversationService } from './activeConversation.service';
import { AuthService } from './authService';

@Injectable({
    providedIn: 'root'
})
export class RelationshipStoreService {
    private friendService = inject(Friend);
    private userService = inject(User);
    private searchService = inject(SearchService);
    private friendRequestService = inject(FriendRequest);
    private userBlockService = inject(UserBlock);
    private socketService = inject(SocketService);
    private convStore = inject(ActiveConversationService);
    private authService = inject(AuthService);

    // --- State ---
    friends = signal<any[]>([]);
    blockedUser = signal<any[]>([]);
    friendRequests = signal<any[]>([]);
    sentRequests = signal<any[]>([]);
    suggestions = signal<any[]>([]);
    isDataLoaded = signal(false);
    
    loading = signal(false);
    isSearching = signal(false);
    error = signal<string | null>(null);

    // --- Helper Sets (for fast lookup) ---
    friendIds = new Set<string>();
    friendRequestsIds = new Set<string>();
    sendingRequestsIds = new Set<string>();
    allFriendIds = new Set<string>();

    constructor() {
        this.setupSocketListeners();
    }

    private getCurrentUserId(): string {
        return String(this.authService.getUserId() || this.convStore.currentUserInfo()?.id || '');
    }

    private getRealtimeStatus(userId: string, fallbackStatus: string = 'offline'): string {
        const uid = String(userId || '');
        if (!uid) return fallbackStatus;

        const presence = this.convStore.userPresence().get(uid);
        if (presence?.status) return presence.status;

        if (this.convStore.onlineUsers().has(uid)) return 'online';
        return fallbackStatus;
    }

    private addSuggestionIfEligible(user: any, userId: string) {
        const uid = String(userId);
        if (!uid) return;
        if (!user || user.is_bot) return;
        if (this.friendIds.has(uid)) return;
        if (this.friendRequestsIds.has(uid)) return;
        if (this.sendingRequestsIds.has(uid)) return;
        if (this.blockedUser().some(b => String(b.friend_id || b.id) === uid)) return;

        this.suggestions.update(list => {
            if (list.some(u => String(u.id || u.friend_id) === uid)) return list;
            return [
                {
                    ...user,
                    id: user.id || user.friend_id || uid,
                    friend_id: user.friend_id || user.id || uid,
                },
                ...list,
            ];
        });
    }

    private removeSuggestionById(userId: string) {
        const uid = String(userId);
        this.suggestions.update(list => list.filter(u => String(u.id || u.friend_id) !== uid));
    }

    loadAllData(currentUserId: string) {
        if (!currentUserId) return;
        
        // Caching: Không load lại nếu đã có dữ liệu
        if (this.isDataLoaded()) {
            console.log('[RelationshipStore] Data already loaded, skipping API call.');
            return;
        }

        this.loading.set(true);
        this.isSearching.set(true);

        forkJoin({
            friends: this.friendService.getFriendByUserId(currentUserId),
            requests: this.friendRequestService.getFriendRequestsByUserId(currentUserId),
            sentRequests: this.friendRequestService.getSentFriendRequestsByUserId(currentUserId),
            blocks: this.userBlockService.getBlockedUserByUserId(currentUserId),
            users: this.userService.getAllUsers(),
        }).subscribe({
            next: (res: any) => {
                const allFriendsArr = res.friends?.metadata?.friends || [];
                const receivedRequestsArr = res.requests?.metadata || [];
                const sentRequestsArr = res.sentRequests?.metadata?.sentFriendRequests || [];
                const blocksArr = res.blocks?.metadata?.userBlocks || [];
                const allUsersArr = res.users?.metadata || [];

                // Reset Helper Sets
                this.allFriendIds = new Set<string>(allFriendsArr.map((f: any) => String(f.friend_id)));
                const blockedIdsSet = new Set<string>(blocksArr.map((b: any) => String(b.blocked_id)));
                
                // Bao gồm tất cả bạn bè kể cả đã chặn
                this.friendIds = new Set<string>(allFriendsArr.map((f: any) => String(f.friend_id)));
                this.friendRequestsIds = new Set<string>(receivedRequestsArr.map((r: any) => String(r.sender_id)));
                this.sendingRequestsIds = new Set<string>(sentRequestsArr.map((r: any) => String(r.receiver_id)));

                const userProfileMap = new Map<string, any>(allUsersArr.map((u: any) => [u.id, u]));

                // 1. Suggestions & Blocks
                const suggestionsList: any[] = [];
                const blockedList: any[] = [];
                
                allUsersArr.forEach((u: any) => {
                    if (u.id === currentUserId) return;

                    if (blockedIdsSet.has(u.id)) {
                        const blockData = blocksArr.find((b: any) => b.blocked_id === u.id);
                        blockedList.push({ ...u, friend_id: u.id, block_id: blockData?.id, reason: blockData?.reason });
                    } else {
                        const isFriend = this.friendIds.has(u.id);
                        const isRequestSent = this.sendingRequestsIds.has(u.id);
                        const isRequestReceived = this.friendRequestsIds.has(u.id);
                        if (!isFriend && !isRequestSent && !isRequestReceived) {
                            suggestionsList.push({ ...u, friend_id: u.id });
                        }
                    }
                });

                // 2. Enriched Friends
                const enrichedFriends = allFriendsArr.map((f: any) => {
                    const profile = userProfileMap.get(f.friend_id);
                    // Đồng bộ trạng thái thực tế từ presence store nếu có, nếu không dùng từ profile
                    const realTimePresence = this.convStore.userPresence().get(String(f.friend_id));
                    const currentStatus = realTimePresence ? realTimePresence.status : (profile?.status || 'offline');
                    
                    return {
                        ...f,
                        full_name: profile?.full_name || 'Người dùng Pigeons',
                        avatar_url: profile?.avatar_url || 'assets/AvatarDefault.jpg',
                        status: currentStatus
                    };
                });

                // 3. Enriched Received Requests
                const enrichedRequests = receivedRequestsArr.map((req: any) => {
                    const profile = userProfileMap.get(req.sender_id);
                    const realTimePresence = this.convStore.userPresence().get(String(req.sender_id));
                    const currentStatus = realTimePresence ? realTimePresence.status : (profile?.status || 'offline');
                    
                    return { 
                        ...req, 
                        sender_name: profile?.full_name, 
                        sender_avatar: profile?.avatar_url,
                        status: currentStatus 
                    };
                });

                // Update signals
                this.friends.set(enrichedFriends);
                this.friendRequests.set(enrichedRequests);
                this.sentRequests.set(sentRequestsArr.map((r: any) => {
                    const profile = userProfileMap.get(r.receiver_id);
                    const realTimePresence = this.convStore.userPresence().get(String(r.receiver_id));
                    return {
                        ...r,
                        receiver_name: profile?.full_name,
                        receiver_avatar: profile?.avatar_url,
                        status: realTimePresence ? realTimePresence.status : (profile?.status || 'offline')
                    };
                }));
                this.blockedUser.set(blockedList);
                this.suggestions.set(suggestionsList.map((u: any) => {
                    const realTimePresence = this.convStore.userPresence().get(String(u.id));
                    return { ...u, status: realTimePresence ? realTimePresence.status : u.status };
                }));

                this.loading.set(false);
                this.isSearching.set(false);
                this.isDataLoaded.set(true);
            },
            error: (err) => {
                console.error('[RelationshipStore] Error:', err);
                this.error.set('Lỗi tải dữ liệu quan hệ.');
                this.loading.set(false);
                this.isSearching.set(false);
            }
        });
    }

    private setupSocketListeners() {
        this.socketService.on('updateFriend', (data: any) => {
            const removerId = data.remover_id;
            const removedFriend = this.friends().find(f => String(f.friend_id || f.id) === String(removerId));
            this.friends.update(list => list.filter(f => String(f.friend_id || f.id) !== String(removerId)));
            this.friendIds.delete(String(removerId));

            if (
                removedFriend &&
                !removedFriend.is_bot &&
                !this.friendRequestsIds.has(String(removerId)) &&
                !this.sendingRequestsIds.has(String(removerId)) &&
                !this.blockedUser().some(b => String(b.friend_id || b.id) === String(removerId))
            ) {
                this.suggestions.update(list => {
                    if (list.some(u => String(u.id || u.friend_id) === String(removerId))) return list;
                    return [
                        {
                            ...removedFriend,
                            id: removedFriend.id || removedFriend.friend_id,
                            friend_id: removedFriend.friend_id || removedFriend.id,
                        },
                        ...list,
                    ];
                });
            }
        });

        this.socketService.on('sendFriendRequest', (data: any) => {
            const currentUserId = this.getCurrentUserId();
            if (String(data.receiver_id) === currentUserId) {
                const senderProfile = this.suggestions().find(u => String(u.id || u.friend_id) === String(data.sender_id));
                const incomingRequest = {
                    ...data,
                    sender_name: data.sender_name || senderProfile?.full_name,
                    sender_avatar: data.sender_avatar || senderProfile?.avatar_url,
                    status: data.status || senderProfile?.status || 'offline',
                };

                if (!this.friendRequests().some(r => String(r.id) === String(data.id))) {
                    this.friendRequests.update(prev => [...prev, incomingRequest]);
                }
                this.friendRequestsIds.add(String(data.sender_id));
                this.removeSuggestionById(String(data.sender_id));

                // Nếu trước đó cũng đã gửi lời mời ngược lại, xóa trạng thái pending phía sent ngay lập tức
                const mirroredSent = this.sentRequests().find(r => String(r.receiver_id) === String(data.sender_id));
                if (mirroredSent) {
                    this.sentRequests.update(list => list.filter(r => String(r.id) !== String(mirroredSent.id)));
                    this.sendingRequestsIds.delete(String(data.sender_id));
                }
            }
        });

        this.socketService.on('cancelSentRequest', (data: any) => {
            const canceledReceived = this.friendRequests().find(r => String(r.id) === String(data));
            const canceledSent = this.sentRequests().find(r => String(r.id) === String(data));

            this.friendRequests.update(list => list.filter(r => String(r.id) !== String(data)));
            this.sentRequests.update(list => list.filter(r => String(r.id) !== String(data)));

            if (canceledReceived?.sender_id) {
                this.friendRequestsIds.delete(String(canceledReceived.sender_id));
                this.addSuggestionIfEligible({
                    id: canceledReceived.sender_id,
                    friend_id: canceledReceived.sender_id,
                    full_name: canceledReceived.sender_name,
                    avatar_url: canceledReceived.sender_avatar,
                    status: canceledReceived.status,
                    is_bot: canceledReceived.is_bot,
                }, String(canceledReceived.sender_id));
            }

            if (canceledSent?.receiver_id) {
                this.sendingRequestsIds.delete(String(canceledSent.receiver_id));
                this.addSuggestionIfEligible({
                    id: canceledSent.receiver_id,
                    friend_id: canceledSent.receiver_id,
                    full_name: canceledSent.receiver_name,
                    avatar_url: canceledSent.receiver_avatar,
                    status: canceledSent.status,
                    is_bot: canceledSent.is_bot,
                }, String(canceledSent.receiver_id));
            }
        });

        this.socketService.on('rejectFriendRequest', (data: any) => {
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId) return;
            const requestId = data?.id ? String(data.id) : '';

            if (String(data.sender_id) === currentUserId) {
                const rejectedSent = requestId
                    ? this.sentRequests().find(r => String(r.id) === requestId)
                    : this.sentRequests().find(r => String(r.receiver_id) === String(data.receiver_id));
                this.sentRequests.update(list => requestId
                    ? list.filter(r => String(r.id) !== requestId)
                    : list.filter(r => String(r.receiver_id) !== String(data.receiver_id))
                );
                this.sendingRequestsIds.delete(String(data.receiver_id));

                this.addSuggestionIfEligible({
                    id: data.receiver_id,
                    friend_id: data.receiver_id,
                    full_name: rejectedSent?.receiver_name,
                    avatar_url: rejectedSent?.receiver_avatar,
                    status: rejectedSent?.status,
                    is_bot: rejectedSent?.is_bot,
                }, String(data.receiver_id));
            }

            if (String(data.receiver_id) === currentUserId) {
                const rejectedReceived = requestId
                    ? this.friendRequests().find(r => String(r.id) === requestId)
                    : this.friendRequests().find(r => String(r.sender_id) === String(data.sender_id));
                this.friendRequests.update(list => requestId
                    ? list.filter(r => String(r.id) !== requestId)
                    : list.filter(r => String(r.sender_id) !== String(data.sender_id))
                );
                this.friendRequestsIds.delete(String(data.sender_id));

                this.addSuggestionIfEligible({
                    id: data.sender_id,
                    friend_id: data.sender_id,
                    full_name: rejectedReceived?.sender_name,
                    avatar_url: rejectedReceived?.sender_avatar,
                    status: rejectedReceived?.status,
                    is_bot: rejectedReceived?.is_bot,
                }, String(data.sender_id));
            }
        });

        this.socketService.on('acceptFriendRequest', (data: any) => {
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId || !data?.sender_id || !data?.receiver_id) return;

            if (currentUserId === String(data.sender_id)) {
                const acceptedReceiverId = String(data.receiver_id);
                const localSent = this.sentRequests().find(r => String(r.receiver_id) === acceptedReceiverId);

                const friendData = {
                    friend_id: acceptedReceiverId,
                    full_name: data.accepted_by?.full_name || localSent?.receiver_name,
                    avatar_url: data.accepted_by?.avatar_url || localSent?.receiver_avatar,
                    status: this.getRealtimeStatus(
                        acceptedReceiverId,
                        data.accepted_by?.status || localSent?.status || 'offline',
                    ),
                };

                this.friends.update(prev => {
                    if (prev.some(f => String(f.friend_id || f.id) === acceptedReceiverId)) return prev;
                    return [...prev, friendData];
                });
                this.friendIds.add(acceptedReceiverId);
                this.sentRequests.update(list => list.filter(r => String(r.receiver_id) !== acceptedReceiverId));
                this.sendingRequestsIds.delete(acceptedReceiverId);
                this.removeSuggestionById(acceptedReceiverId);
            }

            if (currentUserId === String(data.receiver_id)) {
                const acceptedSenderId = String(data.sender_id);
                const localReq = this.friendRequests().find(r => String(r.sender_id) === acceptedSenderId);

                const friendData = {
                    friend_id: acceptedSenderId,
                    full_name: data.request_sender?.full_name || localReq?.sender_name,
                    avatar_url: data.request_sender?.avatar_url || localReq?.sender_avatar,
                    status: this.getRealtimeStatus(
                        acceptedSenderId,
                        data.request_sender?.status || localReq?.status || 'offline',
                    ),
                };

                this.friends.update(prev => {
                    if (prev.some(f => String(f.friend_id || f.id) === acceptedSenderId)) return prev;
                    return [...prev, friendData];
                });
                this.friendIds.add(acceptedSenderId);
                this.friendRequests.update(list => list.filter(r => String(r.sender_id) !== acceptedSenderId));
                this.friendRequestsIds.delete(acceptedSenderId);
                this.removeSuggestionById(acceptedSenderId);
            }
        });

        this.socketService.on('blockUser', (data: any) => {
            const currentUserId = this.getCurrentUserId();
            const blockerId = data?.blocker_id || data?.blockerId || data?.blocker || null;
            const blockedId = data?.blocked_id || data?.blockedId || data?.blocked || null;
            const blockRecordId = data?.id || data?.block_id || null;

            // Only update blockedUser list for the user who performed the block (to sync across their tabs)
            if (!blockerId || String(blockerId) !== currentUserId) return;

            if (!blockedId) return;

            this.blockedUser.update(list => {
                if (list.some(b => String(b.friend_id || b.id) === String(blockedId))) return list;
                return [...list, { friend_id: blockedId, block_id: blockRecordId, reason: data.reason }];
            });
        });

        this.socketService.on('unblockUser', (data: any) => {
            const currentUserId = this.getCurrentUserId();
            const blockerId = data?.blocker_id || data?.blockerId || data?.blocker || null;
            const blockedId = data?.blocked_id || data?.blockedId || data?.blocked || null;

            // Only update unblock for the user who performed the unblock
            if (!blockerId || String(blockerId) !== currentUserId) return;
            if (!blockedId) return;

            this.blockedUser.update(list => list.filter(b => String(b.friend_id || b.id) !== String(blockedId)));
        });
    }

    // --- Actions ---
    sendFriendRequest(currentUserId: string, targetUserId: string) {
        return this.friendRequestService.createFriendRequest(currentUserId, targetUserId, '').subscribe({
            next: (res: any) => {
                const rawRequest = res?.metadata?.newFriendRequest || res?.metadata?.friendRequest || res?.metadata || null;
                const request = rawRequest
                    ? {
                        ...rawRequest,
                        id: rawRequest.id || rawRequest.request_id || rawRequest.requestId,
                        sender_id: String(rawRequest.sender_id || rawRequest.senderId || currentUserId),
                        receiver_id: String(rawRequest.receiver_id || rawRequest.receiverId || targetUserId),
                    }
                    : null;
                if (!request?.id || !request?.sender_id || !request?.receiver_id) {
                    console.error('[RelationshipStore] Invalid createFriendRequest payload:', res);
                    return;
                }

                const targetProfile = this.suggestions().find(u => String(u.id || u.friend_id) === String(targetUserId));
                const requestWithReceiver = {
                    ...request,
                    receiver_name: targetProfile?.full_name,
                    receiver_avatar: targetProfile?.avatar_url,
                    status: targetProfile?.status,
                    is_bot: targetProfile?.is_bot,
                };

                if (!this.sentRequests().some(r => String(r.id) === String(request.id))) {
                    this.sentRequests.update(list => [...list, requestWithReceiver]);
                }
                this.sendingRequestsIds.add(String(targetUserId));
                this.removeSuggestionById(String(targetUserId));

                const currentUser = this.convStore.currentUserInfo();
                this.socketService.emit('sendFriendRequest', {
                    ...request,
                    sender_name: currentUser?.full_name,
                    sender_avatar: currentUser?.avatar_url,
                    status: currentUser?.status || 'offline',
                });
            }
        });
    }

    acceptFriendRequest(currentUserId: string, request: any) {
        const requestId = request.id;
        const sender_id = request.sender_id;

        return forkJoin([
            this.friendRequestService.updateFriendRequest(requestId, 'accepted', 'Accepted by receiver'),
            this.friendService.createFriend(currentUserId, sender_id, false, '')
        ]).subscribe({
            next: ([updateRes, createRes]: [any, any]) => {
                const fullFriendData = {
                    ...request,
                    full_name: request.sender_name,
                    avatar_url: request.sender_avatar,
                    friend_id: sender_id,
                    request_id: requestId,
                    status: this.getRealtimeStatus(String(sender_id), request.status || 'offline'),
                };

                this.friends.update(list => [...list, fullFriendData]);
                this.friendIds.add(String(sender_id));
                this.friendRequests.update(list => list.filter(r => r.id !== requestId));
                this.friendRequestsIds.delete(String(sender_id));
                this.removeSuggestionById(String(sender_id));

                // Đồng bộ trường hợp đã có request ngược chiều
                this.sentRequests.update(list => list.filter(r => String(r.receiver_id) !== String(sender_id)));
                this.sendingRequestsIds.delete(String(sender_id));

                const currentUser = this.convStore.currentUserInfo();
                this.socketService.emit('acceptFriendRequest', {
                    request_id: requestId,
                    sender_id: sender_id,
                    receiver_id: currentUserId,
                    accepted_by: {
                        id: currentUserId,
                        full_name: currentUser?.full_name,
                        avatar_url: currentUser?.avatar_url,
                        status: currentUser?.status || 'offline',
                    },
                    request_sender: {
                        id: sender_id,
                        full_name: request.sender_name,
                        avatar_url: request.sender_avatar,
                        status: request.status || 'offline',
                    },
                });
            }
        });
    }

    cancelFriendRequest(requestId: string) {
        return this.friendRequestService.updateFriendRequest(requestId, 'rejected', 'Canceled by sender').subscribe({
            next: () => {
                const canceled = this.sentRequests().find(r => String(r.id) === String(requestId));
                this.sentRequests.update(list => list.filter(r => r.id !== requestId));
                if (canceled?.receiver_id) {
                    this.sendingRequestsIds.delete(String(canceled.receiver_id));
                    this.addSuggestionIfEligible({
                        id: canceled.receiver_id,
                        friend_id: canceled.receiver_id,
                        full_name: canceled.receiver_name,
                        avatar_url: canceled.receiver_avatar,
                        status: canceled.status,
                        is_bot: canceled.is_bot,
                    }, String(canceled.receiver_id));
                }
                this.socketService.emit('cancelSentRequest', requestId);
            }
        });
    }

    rejectFriendRequest(request: any) {
        const requestId = request.id;
        return this.friendRequestService.updateFriendRequest(requestId, 'rejected', 'Rejected by receiver').subscribe({
            next: () => {
                this.friendRequests.update(list => list.filter(r => r.id !== requestId));
                this.friendRequestsIds.delete(String(request.sender_id));
                this.addSuggestionIfEligible({
                    id: request.sender_id,
                    friend_id: request.sender_id,
                    full_name: request.sender_name,
                    avatar_url: request.sender_avatar,
                    status: request.status,
                    is_bot: request.is_bot,
                }, String(request.sender_id));
                this.socketService.emit('rejectFriendRequest', request);
            }
        });
    }

    deleteFriend(currentUserId: string, friendId: string) {
        return this.friendService.deleteFriend(currentUserId, friendId).subscribe({
            next: () => {
                const removedFriend = this.friends().find(f => String(f.friend_id || f.id) === String(friendId));
                this.friends.update(list => list.filter(f => String(f.friend_id || f.id) !== String(friendId)));
                this.friendIds.delete(String(friendId));

                if (
                    removedFriend &&
                    !removedFriend.is_bot &&
                    !this.friendRequestsIds.has(String(friendId)) &&
                    !this.sendingRequestsIds.has(String(friendId)) &&
                    !this.blockedUser().some(b => String(b.friend_id || b.id) === String(friendId))
                ) {
                    this.suggestions.update(list => {
                        if (list.some(u => String(u.id || u.friend_id) === String(friendId))) return list;
                        return [
                            {
                                ...removedFriend,
                                id: removedFriend.id || removedFriend.friend_id,
                                friend_id: removedFriend.friend_id || removedFriend.id,
                            },
                            ...list,
                        ];
                    });
                }

                this.socketService.emit('updateFriend', {
                    remover_id: currentUserId,
                    target_id: friendId
                });
            }
        });
    }

    blockUser(currentUserId: string, friend: any, reason: string) {
        const friendId = friend.friend_id || friend.id;
        return this.userBlockService.createBlockedUser(currentUserId, friendId, reason).subscribe({
            next: (res: any) => {
                const blockedUser = { ...friend, friend_id: friendId, block_id: res.metadata.newUserBlock.id, reason };
                this.blockedUser.update(list => [...list, blockedUser]);
                this.socketService.emit('blockUser', { blocker_id: currentUserId, blocked_id: friendId, id: res.metadata.newUserBlock.id });
            }
        });
    }

    unblockUser(currentUserId: string, blockId: string, blockedUserId: string) {
        return this.userBlockService.deleteBlockedUser(blockId).subscribe({
            next: () => {
                this.blockedUser.update(list => list.filter(b => b.block_id !== blockId));
                this.socketService.emit('unblockUser', { blocker_id: currentUserId, blocked_id: blockedUserId });
            }
        });
    }

    updateUserStatus(userId: string, status: string) {
        const uid = String(userId);
        this.friends.update(list => list.map(f => (String(f.friend_id) === uid) ? { ...f, status } : f));
        this.suggestions.update(list => list.map(u => (String(u.id) === uid) ? { ...u, status } : u));
        this.friendRequests.update(list => list.map(r => (String(r.sender_id) === uid) ? { ...r, status } : r));
        this.sentRequests.update(list => list.map(r => (String(r.receiver_id) === uid) ? { ...r, status } : r));
    }

    updateUserProfile(data: any) {
        const uid = String(data.id);
        this.friends.update(list => list.map(f => (String(f.friend_id) === uid) ? { ...f, full_name: data.full_name, avatar_url: data.avatar_url } : f));
        this.suggestions.update(list => list.map(u => (String(u.id) === uid) ? { ...u, full_name: data.full_name, avatar_url: data.avatar_url } : u));
    }

    searchUsers(keyword: string) {
        return this.searchService.searchUsers(keyword);
    }
}

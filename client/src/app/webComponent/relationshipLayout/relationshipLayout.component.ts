import { Component, signal, computed, OnChanges, SimpleChanges, Input, ChangeDetectorRef, HostListener, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Friend } from '../../services/friend';
import { FriendRequest } from '../../services/friendrequest';
import { User } from '../../services/user';
import { UserBlock } from '../../services/userBlock';
import { SocketService } from '../../services/socket';
import { UserInforModel } from '../userinforModel/userinforModel.component';
import { response } from 'express';

@Component({
    selector: 'relationship-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, UserInforModel],
    templateUrl: './relationshipLayout.component.html',
    styleUrls: ['./relationshipLayout.component.css']
})
export class RelationshipLayoutComponent implements OnChanges, OnInit, OnDestroy {
    protected readonly title = signal('Relationship');
    @Input() currentUserId: string = '';

    currentTab: 'friends' | 'friend_requests' = 'friends';
    currentSort = signal<'asc' | 'desc'>('asc');

    friends = signal<any[]>([]);
    blockedUser = signal<any[]>([]);
    friendRequests = signal<any[]>([]);

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
        private friendRequestService: FriendRequest,
        private userBlockService: UserBlock,
        private socketService: SocketService,
        private cdr: ChangeDetectorRef,
    ) { }

    ngOnInit() {
        this.setupSocketListeners();
    }

    ngOnDestroy() {
        if (this.updateProfileListener) {
            this.socketService.off('updateProfile', this.updateProfileListener);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['currentUserId'] && this.currentUserId) {
            this.loadData();
        }
    }

    setTab(tab: 'friends' | 'friend_requests') {
        this.currentTab = tab;
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
            this.friends.set(updatedFriends);

            if (updated) {
                this.cdr.markForCheck();
            }
        };

        this.socketService.on('updateProfile', this.updateProfileListener);
    }

    loadData() {
        if (!this.currentUserId) return;
        this.loading = true;

        // Sử dụng forkJoin để đợi cả 3 API trả về cùng lúc
        forkJoin({
            friends: this.friendService.getFriendByUserId(this.currentUserId),
            requests: this.friendRequestService.getFriendRequestsByUserId(this.currentUserId),
            blocks: this.userBlockService.getBlockedUserByUserId(this.currentUserId)
        }).subscribe({
            next: (res: any) => {
                // 1. Lấy dữ liệu thô từ response
                const allFriends = res.friends.metadata.friends || [];
                const friendRequests = res.requests.metadata.friendRequests || [];
                const blockedUserIds = (res.blocks.metadata.userBlocks || []).map((b: any) => b.blocked_id);

                // 2. Lọc ra danh sách bị chặn (để hiển thị trong tab Blocked nếu cần)
                const blockedList = allFriends.filter((f: any) => blockedUserIds.includes(f.friend_id));
                this.blockedUser.set(blockedList);

                // 3. Lọc danh sách bạn bè (loại bỏ những người đã bị chặn)
                const validFriends = allFriends.filter((f: any) => !blockedUserIds.includes(f.friend_id));
                this.friends.set(validFriends);

                // 4. Cập nhật Friend Requests
                this.friendRequests.set(friendRequests);

                this.loading = false;
                this.cdr.detectChanges();

                // Lúc này log chắc chắn sẽ có dữ liệu
                console.log('Blocked users count:', this.blockedUser().length);
                console.log('Friends count:', this.friends().length);
            },
            error: (error) => {
                console.error('Error loading data:', error);
                this.error = error.message;
                this.loading = false;
                this.cdr.detectChanges();
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
        console.log('Data:', requestId, sender_id, action, note);
        // Lấy thông tin người gửi từ request hiện tại để chút nữa gán vào list bạn bè
        const requestInfo = this.friendRequests().find(r => r.id === requestId);

        this.loading = true;

        if (action === 'rejected') {
            this.friendRequestService.updateFriendRequest(requestId, action, note).subscribe({
                next: () => {
                    this.loading = false;
                    this.friendRequests.update((requests: any) => requests.filter((r: any) => r.id !== requestId));
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã từ chối',
                        text: 'Đã từ chối lời mời kết bạn',
                        timer: 1500,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });
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

                    // Thêm vào danh sách bạn bè với đầy đủ thông tin (name, avatar) từ request
                    if (createRes.metadata && createRes.metadata.newFriend && requestInfo) {
                        const fullFriendData = {
                            ...createRes.metadata.newFriend,
                            full_name: requestInfo.sender_name,
                            avatar_url: requestInfo.sender_avatar,
                            // friend_id cần đồng bộ với format của list friends
                            friend_id: sender_id
                        };
                        this.friends.update((friends: any) => [...friends, fullFriendData]);
                    }

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
                },
                error: (error) => {
                    console.error('Error accepting friend request:', error);
                    this.loading = false;
                }
            });
        }
    }

    blockUser(friend: any) {
        console.log(friend);
        const { friend_id, full_name } = friend;
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
                this.userBlockService.createBlockedUser(this.currentUserId, friend_id, reason).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Đã chặn!',
                            text: 'Người dùng này đã bị chặn.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            toast: true,
                            position: 'top-end'
                        });
                        
                        this.friends.update((friends: any) => friends.filter((friend: any) => friend.friend_id !== friend_id));
                        this.blockedUser.update((blockedUsers: any) => [...blockedUsers, friend]);
                    },
                    error: (error) => {
                        console.error('Error blocking user:', error);
                        Swal.fire('Lỗi', 'Không thể chặn người dùng này. Vui lòng thử lại.', 'error');
                    }
                });
            }
        });
    }
}
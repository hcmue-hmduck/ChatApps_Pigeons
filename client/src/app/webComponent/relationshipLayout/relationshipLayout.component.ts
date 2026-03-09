import { Component, signal, OnChanges, SimpleChanges, Input, ChangeDetectorRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Friend } from '../../services/friend';
import { FriendRequest } from '../../services/friendrequest';
import { User } from '../../services/user';
import { UserInforModel } from '../userinforModel/userinforModel';

@Component({
    selector: 'relationship-layout',
    standalone: true,
    imports: [CommonModule, FormsModule, UserInforModel],
    templateUrl: './relationshipLayout.component.html',
    styleUrls: ['./relationshipLayout.component.css']
})
export class RelationshipLayoutComponent implements OnChanges {
    protected readonly title = signal('Relationship');
    @Input() currentUserId: string = '';

    currentTab: 'friends' | 'friend_requests' = 'friends';
    currentSort: 'asc' | 'desc' = 'asc';
    friends: any[] = [];
    groupedFriends: { letter: string, friends: any[] }[] = [];
    friendRequests: any[] = [];
    loading = false;
    error = '';
    showMoreMenuId: string | null = null;
    currentFriendId: string = '';

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
        private userService: User,
        private cdr: ChangeDetectorRef,
    ) { }

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

    loadData() {
        if (!this.currentUserId) return;
        this.loading = true;

        // Fetch data simultaneously
        let friendsLoaded = false;
        let requestsLoaded = false;

        const checkCompletion = () => {
            if (friendsLoaded && requestsLoaded) {
                this.loading = false;
                this.cdr.detectChanges();
            }
        };

        this.friendService.getFriendByUserId(this.currentUserId).subscribe({
            next: (response) => {
                this.friends = response.metadata.friends || [];
                this.groupedFriends = this.groupFriendsByAlphabet(this.friends);
                friendsLoaded = true;
                checkCompletion();
            },
            error: (error) => {
                console.error('Error loading friends:', error);
                this.error = error.message;
                friendsLoaded = true;
                checkCompletion();
            }
        });

        this.friendRequestService.getFriendRequestsByUserId(this.currentUserId).subscribe({
            next: (response) => {
                this.friendRequests = response.metadata.friendRequests || [];
                requestsLoaded = true;
                checkCompletion();
            },
            error: (error) => {
                console.error('Error loading friend requests:', error);
                this.error = error.message;
                requestsLoaded = true;
                checkCompletion();
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
        if (option === 'asc') {
            this.sortAtoZ();
        } else if (option === 'desc') {
            this.sortZtoA();
        }
    }

    sortAtoZ() {
        this.groupedFriends.sort((a, b) => a.letter.localeCompare(b.letter, 'vi-VN'));
        this.groupedFriends.forEach(group => {
            group.friends.sort((a, b) => {
                const nameA = a.full_name || '';
                const nameB = b.full_name || '';
                return nameA.localeCompare(nameB, 'vi-VN');
            });
        });
    }

    sortZtoA() {
        this.groupedFriends.sort((a, b) => b.letter.localeCompare(a.letter, 'vi-VN'));
        this.groupedFriends.forEach(group => {
            group.friends.sort((a, b) => {
                const nameA = a.full_name || '';
                const nameB = b.full_name || '';
                return nameB.localeCompare(nameA, 'vi-VN');
            });
        });
    }

    viewProfile(friend_id: string) {
        console.log('View profile:', friend_id);
        this.currentFriendId = friend_id;
        this.userService.getUserById(friend_id).subscribe({
            next: (response) => {
                console.log(response);
                this.userProfileModal.open(response.metadata.userInfor);
            },
            error: (error) => {
                console.error('Error loading user:', error);
                this.error = error.message;
            }
        });
       
    }
}
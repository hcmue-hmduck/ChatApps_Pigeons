import { Component, signal, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Friend } from '../../services/friend';
import { FriendRequest } from '../../services/friendrequest';

@Component({
    selector: 'relationship-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './relationshipLayout.component.html',
    styleUrls: ['./relationshipLayout.component.css']
})
export class RelationshipLayoutComponent implements OnChanges {
    protected readonly title = signal('Relationship');
    @Input() currentUserId: string = '';

    currentTab: 'friends' | 'friend_requests' = 'friends';
    friends: any[] = [];
    friendRequests: any[] = [];
    loading = false;
    error = '';

    constructor(
        private friendService: Friend,
        private friendRequestService: FriendRequest,
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
}
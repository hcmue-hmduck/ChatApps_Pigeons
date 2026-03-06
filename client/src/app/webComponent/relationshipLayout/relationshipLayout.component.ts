import { Component, signal, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Friend } from '../../services/friend';

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

    friends: any[] = [];
    loading = false;
    error = '';

    constructor(
        private friendService: Friend,
        private cdr: ChangeDetectorRef,
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['currentUserId'] && this.currentUserId) {
            this.loadFriends();
        }
    }

    loadFriends() {
        if (!this.currentUserId) return;
        console.log(`Friends By ID ${this.currentUserId}`);
        this.loading = true;
        this.friendService.getFriendByUserId(this.currentUserId).subscribe({
            next: (response) => {
                this.friends = response.metadata.friends || [];
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                console.error('Error:', error);
                this.error = error.message;
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
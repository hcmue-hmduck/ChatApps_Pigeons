import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { User } from '../../services/user';
import { FriendRequest } from '../../services/friendrequest';

@Component({
  selector: 'app-search-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchusermodalLayout.component.html',
  styleUrl: './searchusermodalLayout.component.css'
})
export class SearchUserModalComponent {
  @Input() currentUserId: string = '';
  @Output() close = new EventEmitter<void>();

  searchKeyword = '';
  searchResults = signal<any[]>([]);
  isSearching = signal(false);
  sendingRequests = new Set<string>();
  currentUser = signal<any>(null);

  constructor(
    private userService: User,
    private friendRequestService: FriendRequest
  ) { }

  ngOnInit() {
    this.loadingData();
  }

  loadingData() {
    this.isSearching.set(true);
    forkJoin({
      users: this.userService.getAllUsers(),
      sentRequests: this.friendRequestService.getSentFriendRequestsByUserId(this.currentUserId),
      currentUser: this.userService.getUserById(this.currentUserId)
    }).subscribe({
      next: (res: any) => {
        const allUsers = res.users.metadata || [];
        const filteredUsers = allUsers.filter((u: any) => u.id !== this.currentUserId);
        this.searchResults.set(filteredUsers);

        this.currentUser.set(res.currentUser.metadata);

        const sent = res.sentRequests.metadata.sentFriendRequests || [];
        sent.forEach((req: any) => {
          if (req.receiver_id) {
            this.sendingRequests.add(req.receiver_id);
          }
        });

        this.isSearching.set(false);
      },
      error: (err: any) => {
        console.error('Error loading initial modal data:', err);
        this.isSearching.set(false);
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
        // Filter out current user
        const users = (res.results.metadata?.users || []).filter((u: any) => u.id !== this.currentUserId);
        this.searchResults.set(users);

        // Update sent requests status
        const sent = res.sentRequests.metadata?.sentFriendRequests || [];
        // Clear and rebuild set for fresh state if needed, or just append
        // Rebuilding is safer to catch cancellations from other parts of the app
        this.sendingRequests = new Set<string>();
        sent.forEach((req: any) => {
          if (req.receiver_id) {
            this.sendingRequests.add(req.receiver_id);
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

  sendFriendRequest(receiverId: string) {
    if (this.sendingRequests.has(receiverId)) return;

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
        this.sendingRequests.add(receiverId);
        this.friendRequestService.createFriendRequest(this.currentUserId, receiverId, note).subscribe({
          next: () => {
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
            this.sendingRequests.delete(receiverId);
            Swal.fire('Lỗi', 'Không thể gửi lời mời. Vui lòng thử lại.', 'error');
          }
        });
      }
    });
  }

  isRequestSent(userId: string): boolean {
    return this.sendingRequests.has(userId);
  }

  closeModal() {
    this.close.emit();
  }

  sendMessage(receiverId: string) {
    console.log('Người nhận', receiverId);
  }
}

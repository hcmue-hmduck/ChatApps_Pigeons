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
import { AuthService } from '../../services/authService';
import { User } from '../../services/user';
import { SocketService } from '../../services/socket';

@Component({
    selector: 'user-infor-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './userinforModel.html',
    styleUrls: ['./userinforModel.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInforModel {
    cdr = inject(ChangeDetectorRef);
    authService = inject(AuthService);

    userInfo = signal<any>(null);
    @Input() currentUserId = '';
    @Output() profileUpdated = new EventEmitter<any>();

    showProfileModal = signal(false);
    isEditingProfile = signal(false);
    showChangePassword = signal(false);
    editForm: any = {};
    changePassForm = { oldPass: '', newPass: '', confirmPass: '' };

    constructor(
        private userService: User,
        private socketService: SocketService,
    ) { }

    ngOnInit() {
        if (this.currentUserId) {
            this.authService.setUserInfor(this.currentUserId);
            this.fetchUserInfo();
            this.setupSocketListeners();
        }
    }

    private fetchUserInfo() {
        this.userService.getUserById(this.currentUserId).subscribe({
            next: (res) => {
                if (res.metadata && res.metadata.user) {
                    this.userInfo.set(res.metadata.user);
                    this.cdr.markForCheck();
                }
            },
            error: (err) => console.error('Error fetching user info in modal:', err)
        });
    }

    // Public method to open the modal from parent
    open(user: any) {
        this.userInfo.set(user);
        this.showProfileModal.set(true);
        this.cdr.markForCheck();
    }

    setupSocketListeners() {
        this.socketService.on('updateProfile', (data: any) => {
            if (data.user_id === this.currentUserId) {
                this.userInfo.update((old: any) => ({
                    ...old,
                    full_name: data.full_name,
                    avatar_url: data.avatar_url,
                    updated_at: data.updated_at
                }));
                this.cdr.markForCheck();
            }
        });
    }

    ngOnDestroy() {
        this.socketService.off('updateProfile');
    }

    openProfileModal() {
        this.showProfileModal.set(true);
    }

    closeProfileModal() {
        this.showProfileModal.set(false);
        this.isEditingProfile.set(false);
        this.showChangePassword.set(false);
    }

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

    toggleChangePassword() {
        this.showChangePassword.update(v => !v);
    }

    saveProfile() {
        this.userService.updateUser(this.currentUserId, this.editForm).subscribe({
            next: () => {
                const updatedData = { ...this.userInfo(), ...this.editForm, updated_at: new Date().toISOString() };
                this.userInfo.set(updatedData);

                // Emit to parent (Sidebar) to refresh the UI immediately
                this.profileUpdated.emit(updatedData);

                this.socketService.emit('updateProfile', updatedData);
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
import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    inject,
    signal,
    ElementRef,
    ViewChild,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/authService';
import { User } from '../../services/user';
import { SocketService } from '../../services/socket';
import { UploadService } from '../../services/uploadService';

@Component({
    selector: 'user-infor-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './userinforModel.component.html',
    styleUrls: ['./userinforModel.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserInforModel {
    cdr = inject(ChangeDetectorRef);
    authService = inject(AuthService);

    userInfo = signal<any>(null);
    @Input() currentUserId = '';
    @Input() editPremission = true;
    @Output() profileUpdated = new EventEmitter<any>();

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    showProfileModal = signal(false);
    isEditingProfile = signal(false);
    showChangePassword = signal(false);
    loadingUser = signal(false);
    uploadingAvatar = signal(false);
    editForm: any = {};
    changePassForm = { oldPass: '', newPass: '', confirmPass: '' };
    private onUpdateProfileSocket?: (data: any) => void;

    constructor(
        private userService: User,
        private uploadService: UploadService,
        private socketService: SocketService
    ) { }

    ngOnInit() {
        if (this.currentUserId) {
            this.setupSocketListeners();
        }
    }

    // Public method to open the modal from parent using User ID
    open(userId: string) {
        this.currentUserId = userId;
        this.loadingUser.set(true);
        this.showProfileModal.set(true);
        this.cdr.markForCheck();

        this.userService.getUserById(userId).subscribe({
            next: (response) => {
                const user = response.metadata?.userInfor || response.metadata || null;
                this.userInfo.set(user);
                this.loadingUser.set(false);
                this.cdr.markForCheck();
            },
            error: (error) => {
                console.error('Error loading user info:', error);
                this.loadingUser.set(false);
                this.cdr.markForCheck();
            }
        });
    }

    setupSocketListeners() {
        if (this.onUpdateProfileSocket) {
            this.socketService.off('updateProfile', this.onUpdateProfileSocket);
        }

        this.onUpdateProfileSocket = (data: any) => {
            const updatedUserId = data?.id || data?.user_id;
            if (updatedUserId === this.currentUserId) {
                this.userInfo.update((old: any) => ({
                    ...old,
                    full_name: data.full_name,
                    avatar_url: data.avatar_url,
                    updated_at: data.updated_at
                }));
                this.cdr.markForCheck();
            }
        };

        this.socketService.on('updateProfile', this.onUpdateProfileSocket);
    }

    ngOnDestroy() {
        if (this.onUpdateProfileSocket) {
            this.socketService.off('updateProfile', this.onUpdateProfileSocket);
            this.onUpdateProfileSocket = undefined;
        }
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

    changeAvatar() {
        this.fileInput.nativeElement.click();
    }

    onAvatarFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('files', file);

        this.uploadingAvatar.set(true);
        this.cdr.markForCheck();

        this.uploadService.uploadFile(`avatars:${this.currentUserId}`, formData).subscribe({
            next: (res: any) => {
                const avatarUrl = res?.metadata?.files?.[0]?.url;
                if (avatarUrl) {
                    this.userService.updateUser(this.currentUserId, { avatar_url: avatarUrl }).subscribe({
                        next: () => {
                            const updated = { ...this.userInfo(), avatar_url: avatarUrl };
                            this.userInfo.set(updated);
                            this.profileUpdated.emit(updated);
                            this.socketService.emit('updateProfile', updated);
                        },
                        error: (err: any) => console.error('Error saving avatar:', err),
                    });
                }
                this.uploadingAvatar.set(false);
                this.cdr.markForCheck();
                this.fileInput.nativeElement.value = '';
            },
            error: (err: any) => {
                console.error('Error uploading avatar:', err);
                this.uploadingAvatar.set(false);
                this.cdr.markForCheck();
                this.fileInput.nativeElement.value = '';
            },
        });
    }
}
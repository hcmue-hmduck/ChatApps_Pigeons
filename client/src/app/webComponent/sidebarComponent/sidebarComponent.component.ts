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
import { ActivatedRoute } from '@angular/router';
import { NavigationService, AppView } from '../../services/navigation';
import { AuthService } from '../../services/authService';
import { User } from '../../services/user';
import { SocketService } from '../../services/socket';
import { ConversationLayoutComponent } from '../conversationLayout/conversationLayout.component';
import { RelationshipLayoutComponent } from '../relationshipLayout/relationshipLayout.component';
import { UserInforModel } from '../userinforModel/userinforModel.component';
import { NewFeedsLayoutComponent } from '../newFeedsLayout/newFeedsLayout.component';
import { FileUtils } from '../../utils/FileUtils/fileUltils';
import { error } from 'console';

@Component({
    selector: 'sidebar-component',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ConversationLayoutComponent,
        RelationshipLayoutComponent,
        UserInforModel,
        NewFeedsLayoutComponent,
    ],
    templateUrl: './sidebarComponent.component.html',
    styleUrls: ['./sidebarComponent.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent implements OnInit, OnDestroy {
    navService = inject(NavigationService);
    authService = inject(AuthService);
    cdr = inject(ChangeDetectorRef);

    // ── State ──────────────────────────────────────────────
    currentUserId = '';
    userInfo = signal<any>(null);
    loading = signal(false);
    isReady = signal(false);

    constructor(
        private router: ActivatedRoute,
        private userService: User,
        private socketService: SocketService,
        public fileUtils: FileUtils
    ) { }

    ngOnInit() {
        this.currentUserId = this.router.snapshot.paramMap.get('id') || '';
        this.authService.setUserInfo(this.currentUserId);
        this.setupSocketListeners();
        this.loadUserInfo();
    }

    ngOnDestroy() {
        this.socketService.off('updateProfile_sidebar');
    }

    handleLogout() {
        this.authService
            .logout()
            .subscribe({
                next: () => window.location.href = '/',
                error: (error) => console.error(error),
            });
    }

    // ── Socket Listeners ──────────────────────────────────
    setupSocketListeners() {
        this.socketService.on('updateProfile_sidebar', (data: any) => {
            if (data.id === this.currentUserId) {
                this.userInfo.set(data);
                this.cdr.markForCheck();
            }
        });
    }

    // ── Load Data ─────────────────────────────────────────
    loadUserInfo() {
        this.loading.set(true);
        this.userService.getUserById(this.currentUserId).subscribe({
            next: (response) => {
                console.log('User', response.metadata?.userInfor);
                this.userInfo.set(response.metadata?.userInfor || null);
                this.isReady.set(true);
                this.loading.set(false);
                this.cdr.markForCheck(); // Cần thiết để báo cho OnPush biết dữ liệu đã về
            },
            error: (error) => {
                console.error('Error loading user info:', error);
                this.isReady.set(true);
                this.loading.set(false);
            },
        });
    }

    // ── Navigation ────────────────────────────────────────
    setView(view: AppView) {
        this.navService.setView(view);
    }

    goToMessagesWelcome() {
        this.navService.goToMessagesWelcome();
    }

    isActive(view: AppView): boolean {
        return this.navService.activeView() === view;
    }

    // ── Profile Modal Callback ────────────────────────────
    handleProfileUpdate(updatedData: any) {
        // Sync local userInfo state from modal response
        this.userInfo.set(updatedData);
        this.cdr.markForCheck();
    }
}

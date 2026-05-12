import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/authService';

@Component({
    selector: 'user-admin-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './userAdminLayout.component.html',
    styleUrls: ['./userAdminLayout.component.css']
})

export class UserAdminLayoutComponent implements OnInit {
    protected readonly title = signal('User Administration');
    users = signal<any[]>([]);
    loading = false;
    error = '';
    lockLoadingIds = new Set<string>();

    constructor(
        private userService: User,
        private router: ActivatedRoute,
        private authService: AuthService,
    ) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.userService.getAllUsers().subscribe({
            next: (response) => {
                console.log(response.metadata);
                const users = response.metadata || [];
                const normalized = users
                    .filter((u: any) => !u.is_bot)
                    .map((u: any) => ({
                        ...u,
                        is_active: u.is_active !== false,
                    }));
                this.users.set(normalized);
                this.loading = false;
            },
            error: (error) => {
                this.error = error.message;
                this.loading = false;
            }
        });
    }

    isLocking(userId: string) {
        return this.lockLoadingIds.has(userId);
    }

    isSelf(user: any) {
        const currentId = this.authService.getUserInfor()?.id;
        return !!currentId && user?.id === currentId;
    }

    toggleLock(user: any) {
        if (!user?.id) return;
        if (this.isSelf(user)) return;

        const isActive = user.is_active !== false;
        this.lockLoadingIds.add(user.id);

        const request$ = isActive
            ? this.userService.lockUser(user.id)
            : this.userService.unlockUser(user.id);

        request$.subscribe({
            next: (response) => {
                const updated = response?.metadata || response?.data;
                const nextIsActive =
                    updated && typeof updated.is_active === 'boolean'
                        ? updated.is_active
                        : !isActive;

                this.users.update((items) =>
                    items.map((item) =>
                        item.id === user.id
                            ? {
                                  ...item,
                                  is_active: nextIsActive,
                              }
                            : item,
                    ),
                );
                this.lockLoadingIds.delete(user.id);
            },
            error: (error) => {
                this.error = error.message;
                this.lockLoadingIds.delete(user.id);
            }
        });
    }
}
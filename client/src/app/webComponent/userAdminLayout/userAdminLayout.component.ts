import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'user-admin-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './userAdminLayout.component.html',
    styleUrls: ['./userAdminLayout.component.css']
})

export class UserAdminLayoutComponent implements OnInit {
    protected readonly title = signal('User Administration');
    users: any[] = [];
    loading = false;
    error = '';

    constructor(private userService: User, private router: ActivatedRoute) {}

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.userService.getAllUsers().subscribe({
            next: (response) => {
                this.users = response.metadata || [];
                this.loading = false;
            },
            error: (error) => { 
                console.error('Error:', error);
                this.error = error.message;
                this.loading = false;
            }
        });
    }

//     loadUsers() {
//     this.loading = true;
//     this.userService.getAllUsers().subscribe({
//       next: (response) => {
//         // console.log('Response:', response);
//         this.users = response.metadata || [];  // Sửa từ data thành metadata
//         this.loading = false;
//       },
//       error: (error) => {
//         console.error('Error:', error);
//         this.error = error.message;
//         this.loading = false;
//       }
//     });
//   }
}
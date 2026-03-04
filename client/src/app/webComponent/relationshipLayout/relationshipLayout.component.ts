import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'relationship-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './relationshipLayout.component.html',
    styleUrls: ['./relationshipLayout.component.css']
})

export class RelationshipLayoutComponent implements OnInit {
    protected readonly title = signal('Relationship');
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
}
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Home } from '../../services/home';

    
@Component({
    selector: 'home-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './homeLayout.component.html',
    styleUrls: ['./homeLayout.component.css']
})

export class HomeLayoutComponent implements OnInit {
    protected readonly title = signal('Home');
    ngOnInit() {
        
    }

}
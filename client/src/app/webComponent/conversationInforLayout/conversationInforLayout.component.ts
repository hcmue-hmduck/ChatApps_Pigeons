import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-conversation-infor-layout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './conversationInforLayout.component.html',
    styleUrls: ['./conversationInforLayout.component.css']
})
export class ConversationInforLayoutComponent {
    @Output() closePanel = new EventEmitter<void>();

    // Accordion States
    sections = signal({
        chatInfo: false,
        customization: false,
        members: false,
        media: true,
        privacy: false
    });

    // Mockup Data
    recentMedia = [
        { id: 1, url: 'https://picsum.photos/seed/media1/200/200' },
        { id: 2, url: 'https://picsum.photos/seed/media2/200/200' },
        { id: 3, url: 'https://picsum.photos/seed/media3/200/200' }
    ];

    recentFiles = [
        { name: 'Brand_Guidelines_v2.pdf', size: '4.2 MB', date: 'Oct 12, 2023', type: 'pdf' },
        { name: 'Project_Scope.docx', size: '1.8 MB', date: 'Oct 10, 2023', type: 'docx' }
    ];

    toggleSection(sectionName: keyof ReturnType<typeof this.sections>) {
        const current = this.sections();
        this.sections.set({
            ...current,
            [sectionName]: !current[sectionName]
        });
    }
}

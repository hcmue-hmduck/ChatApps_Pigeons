import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import packageInfo from '../../../../package.json';

@Component({
  selector: 'app-intro-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './introLayout.component.html',
  styleUrls: ['./introLayout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntroLayoutComponent {
  version = packageInfo.version;
  @Input() hasConversations: boolean = false;
  @Output() startNewConversation = new EventEmitter<void>();

  handleStart() {
    this.startNewConversation.emit();
  }
}

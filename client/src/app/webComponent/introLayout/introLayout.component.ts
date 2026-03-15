import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './introLayout.component.html',
  styleUrls: ['./introLayout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntroLayoutComponent {
  @Output() startNewConversation = new EventEmitter<void>();

  handleStart() {
    this.startNewConversation.emit();
  }
}

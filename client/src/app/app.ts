import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CallBroadcastService } from './services/callBroadcastService';
import { CallService } from './services/callService';
import { IncommingCallLayout } from './webComponent/incommingCallLayout/incommingCallLayout';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, CommonModule, IncommingCallLayout],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App implements OnInit {
    protected readonly title = signal('client');
    callBroadcastService = inject(CallBroadcastService);
    callService = inject(CallService);

    ngOnInit() {
        this.callBroadcastService.listenEvents((event) => {
            console.log(`callBroadcastService.listenEvents:::`, event);

            if (event.type === 'call_close') {
                const { call_id } = event.data;
                if (!call_id) console.error('params invalid');

                this.callService.updateStatus(call_id, 'ended');
            }
        });
    }
}

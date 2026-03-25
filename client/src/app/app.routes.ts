import { Routes } from '@angular/router';
import { SidebarComponent } from './webComponent/sidebarComponent/sidebarComponent.component';
import { AdminLayoutComponent } from './webComponent/adminLayout/adminLayout.component';
import { HomeLayoutComponent } from './webComponent/homeLayout/homeLayout.component';
import { MessagesLayoutComponent } from './webComponent/messagesLayout/messagesLayout.component';
import { CallLayoutComponent } from './webComponent/callLayout/callLayout';
import { NewFeedsLayoutComponent } from './webComponent/newFeedsLayout/newFeedsLayout.component';
import { RelationshipLayoutComponent } from './webComponent/relationshipLayout/relationshipLayout.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeLayoutComponent,
    },
    {
        path: 'conversations/:id',
        component: SidebarComponent,
    },
    {
        path: 'admin',
        component: AdminLayoutComponent,
    },
    {
        path: 'call-display',
        component: CallLayoutComponent,
    }
];

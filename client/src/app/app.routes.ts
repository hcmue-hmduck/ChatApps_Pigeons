import { Routes } from '@angular/router';
import { ConversationLayoutComponent } from './webComponent/conversationLayout/conversationLayout.component';
import { UserAdminLayoutComponent } from './webComponent/userAdminLayout/userAdminLayout.component';
import { HomeLayoutComponent } from './webComponent/homeLayout/homeLayout.component';
import { MessagesLayoutComponent } from './webComponent/messagesLayout/messagesLayout.component';
import { CallLayoutComponent } from './webComponent/callLayout/callLayout';

export const routes: Routes = [
    {
        path: '',
        component: HomeLayoutComponent
    },
    {
        path: 'conversations/:id',
        component: ConversationLayoutComponent
    },
    {
        path: 'admin/users',
        component: UserAdminLayoutComponent
    },
    {
        path: 'messages/:id',
        component: MessagesLayoutComponent
    },
    {
        path: 'call-display',
        component: CallLayoutComponent
    }
];

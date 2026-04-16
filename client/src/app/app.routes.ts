import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './webComponent/adminLayout/adminLayout.component';
import { HomeLayoutComponent } from './webComponent/homeLayout/homeLayout.component';
import { CallLayoutComponent } from './webComponent/callLayout/callLayout';
import { NewFeedsLayoutComponent } from './webComponent/newFeedsLayout/newFeedsLayout.component';
import { RelationshipLayoutComponent } from './webComponent/relationshipLayout/relationshipLayout.component';
import { ConversationLayoutComponent } from './webComponent/conversationLayout/conversationLayout.component';
import { MainLayoutComponent } from './webComponent/mainLayout/mainLayout.component';
import { IntroLayoutComponent } from './webComponent/introLayout/introLayout.component';
import { MessagesLayoutComponent } from './webComponent/messagesLayout/messagesLayout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        component: HomeLayoutComponent,
        pathMatch: 'full'
    },
    {
        path: 'call-display',
        component: CallLayoutComponent,
        canActivate: [authGuard]
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'conversations',
                component: ConversationLayoutComponent,
                children: [
                    {
                        path: '',
                        component: IntroLayoutComponent,
                    },
                    {
                        path: ':convID',
                        component: MessagesLayoutComponent,
                    }
                ]
            },
            {
                path: 'new-feeds',
                component: NewFeedsLayoutComponent,
            },
            {
                path: 'relationship',
                component: RelationshipLayoutComponent,
            },
            {
                path: 'admin',
                component: AdminLayoutComponent,
            }
        ]
    }
];

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Feeds } from "../../services/feeds";

@Component({
    selector: 'new-feeds-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './newFeedsLayout.component.html',
    styleUrl: './newFeedsLayout.component.css'
})
export class NewFeedsLayoutComponent {
    constructor(private feedsService: Feeds) { }

    posts = signal<any[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    currentUser = {
        avatar: 'https://ui-avatars.com/api/?name=Chat+Pigeons&background=06131f&color=00f2ff'
    };
    trending: Array<{ tag: string; cat: string; count: string }> = [];
    onlineNodes: Array<{ name: string; avatar: string; status: string }> = [];

    ngOnInit() {
        this.loadFeeds();
    }

    loadFeeds() {
        const userId = '4e6c77aa-7660-49a0-8f83-4edda5deb81f'; // Replace with actual user ID logic
        this.loading.set(true);
        this.error.set(null);

        this.feedsService.getFeeds(userId).subscribe({
            next: (data) => {
                this.posts.set(data.metadata.homePosts || []);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading feeds:', err);
                this.error.set('Failed to load feeds. Please try again later.');
                this.loading.set(false);
            }
        });
    }

    parseContent(content: string | null | undefined): string[] {
        return (content || '').split(/\s+/).filter(Boolean);
    }

    getPostAuthorName(post: any): string {
        return post?.author?.full_name || post?.author?.name || `User ${String(post?.user_id || '').slice(0, 8)}`;
    }

    getPostAuthorAvatar(post: any): string {
        return post?.author?.avatar_url
            || post?.author?.avatar
            || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getPostAuthorName(post))}&background=0b1b2b&color=ffffff`;
    }

    getPostImage(post: any): string | null {
        return post?.image
            || post?.media?.[0]?.media_url
            || post?.postMedia?.[0]?.media_url
            || post?.post_media?.[0]?.media_url
            || null;
    }

    formatPostTime(dateValue: string | null | undefined): string {
        if (!dateValue) return 'Vừa xong';

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Vừa xong';

        const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        if (diffSeconds < 60) return 'Vừa xong';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
        if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} ngày trước`;

        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    formatPrivacy(privacy: string | null | undefined): string {
        switch (privacy) {
            case 'public':
                return 'Công khai';
            case 'friends':
                return 'Bạn bè';
            case 'only_me':
                return 'Chỉ mình tôi';
            case 'custom':
                return 'Tùy chỉnh';
            default:
                return 'Công khai';
        }
    }

    formatPostType(postType: string | null | undefined): string {
        switch (postType) {
            case 'image':
                return 'Ảnh';
            case 'video':
                return 'Video';
            case 'link':
                return 'Liên kết';
            case 'poll':
                return 'Khảo sát';
            case 'share':
                return 'Chia sẻ';
            default:
                return 'Bài viết';
        }
    }

}

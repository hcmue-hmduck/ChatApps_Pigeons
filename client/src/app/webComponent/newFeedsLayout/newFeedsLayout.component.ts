import { Component, Input, signal } from '@angular/core';
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

    private _userInfor: any;
    @Input() set userInfor(value: any) {
        if (value) {
            console.log('Dữ liệu User đã về:', value);
            this._userInfor = value;
            // Cập nhật avatar cho creator từ dữ liệu thật
            this.currentUser.avatar = value.avatar_url || this.currentUser.avatar;
        }
    }
    get userInfor(): any {
        return this._userInfor;
    }

    posts = signal<any[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    currentUser = {
        avatar: 'https://ui-avatars.com/api/?name=Chat+Pigeons&background=06131f&color=00f2ff'
    };
    trending: Array<{ tag: string; cat: string; count: string }> = [
        { tag: '#NeuralLink', cat: 'Tech', count: '12.4k transmissions' },
        { tag: '#CyberChat', cat: 'Network', count: '8.9k transmissions' },
        { tag: '#NeonMesh', cat: 'Grid', count: '6.2k transmissions' },
        { tag: '#QuantumKeys', cat: 'Security', count: '4.1k transmissions' }
    ];
    onlineNodes: Array<{ name: string; avatar: string; status: string }> = [
        {
            name: 'Aria Nova',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuW4uOJnow85o2xP-U-CMEPcslX82Tii-UE4q2CB0VX-22kH16kuUUK1DfGw21zQ2h9z_HKh6s0Q5byP0G11DkLStgjFNccLavDxT4TF0sGj5La82iY3Rwg1l0uqewhvsKpxL4GfxCKl4-xCNGwRdnifygWqCwxsW4j0waifHWX435uMGIAuPAXbWtn5KtTuAJobOhuVQvf4Oo0vrGtjQOAOdUiogC_z4JXZlimcQrPJ7p2j1Vq9EjQqpikpU6WPfsJr-boh87qc4',
            status: 'online'
        },
        {
            name: 'K-Xero',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC90h8goqIc76g33FxjsWw1XkUtXtdlf5L6rxo4MyfQPMzC2lW1BeviDuSK3mh_pirj6mQ9Zgmp3ypqIbPn2D3aJUequ0teaRr34spBQ6BRCyWQsAFhHZaRaoKz3gNhIBuX4_UnH3JvL1iZlTOfqAZFyFB6D59zXe0d56yXW2mzNuWL-hpfaXGA675zKbY7D8-iNlXLvV1Ck0r2w_0LhHcAteglURRpxouo9YvoY5lkK3--6gY2vISDhg40yvrsBnF3n_s1360GPSs',
            status: 'online'
        },
        {
            name: 'Omni_Sys',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhcGFNKqmwCg8XtLzxAt_JpJSsbvYY6oLZd8CXM7IeryCmBN-WAHWVezJJUtwgPzwceOxtZOxLvlrXBqF9U47VQ7f3Z1Fl7bY5h7cTLU628YfoJ5Nr6j5JiRawqclb4f73K0yucnsJLt8lyc5PKG-Eo3rNUMkE_qFTiP3fd1Ozlagl7pHADRtWt4zrKarOs8_LyCJe89lvAnMECCozSCjIaDCU2uwAuZfh4KGYV09PrKOzjbuNJB02B3frapXluyFkuVm7OWK_YRg',
            status: 'offline'
        }
    ];
    expandedPosts = new Set<string>();

    // Lightbox State
    isLightboxOpen = false;
    selectedMediaPost: any = null;
    currentMediaIndex = 0;

    ngOnInit() {
        this.loadFeeds();
    }

    toggleComments(postId: string) {
        if (this.expandedPosts.has(postId)) {
            this.expandedPosts.delete(postId);
        } else {
            this.expandedPosts.add(postId);
        }
    }

    isCommentsExpanded(postId: string): boolean {
        return this.expandedPosts.has(postId);
    }

    loadFeeds() {
        this.loading.set(true);
        this.error.set(null);

        this.feedsService.getFeeds().subscribe({
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
        return post?.user_infor?.full_name;
    }

    getPostAuthorAvatar(post: any): string {
        return post?.user_infor?.avatar_url;
    }

    getCommentAuthorName(comment: any): string {
        return comment?.user_infor?.full_name || 'Anonymous';
    }

    getCommentAuthorAvatar(comment: any): string {
        return comment?.user_infor?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=06131f&color=00f2ff';
    }

    getPostImage(post: any): string | null {
        return post?.post_media?.[0]?.media_url || null;
    }

    getMediaLayoutClass(post: any): string {
        const medias = post?.post_media || [];
        const count = medias.length;
        if (count === 0) return '';

        let orientation = 'square';
        const firstMedia = medias[0];
        if (firstMedia?.width && firstMedia?.height) {
            const ratio = firstMedia.width / firstMedia.height;
            if (ratio > 1.2) orientation = 'landscape';
            else if (ratio < 0.8) orientation = 'portrait';
        }

        const countClass = count >= 4 ? '4p' : count.toString();
        return `media-grid-${countClass} hero-${orientation}`;
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

    // Lightbox Methods
    openLightbox(post: any, index: number) {
        this.selectedMediaPost = post;
        this.currentMediaIndex = index;
        this.isLightboxOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    closeLightbox() {
        this.isLightboxOpen = false;
        this.selectedMediaPost = null;
        this.currentMediaIndex = 0;
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    nextMedia(event: Event) {
        event.stopPropagation();
        if (this.selectedMediaPost?.post_media) {
            this.currentMediaIndex = (this.currentMediaIndex + 1) % this.selectedMediaPost.post_media.length;
        }
    }

    prevMedia(event: Event) {
        event.stopPropagation();
        if (this.selectedMediaPost?.post_media) {
            this.currentMediaIndex = (this.currentMediaIndex - 1 + this.selectedMediaPost.post_media.length) % this.selectedMediaPost.post_media.length;
        }
    }

    // Threaded Comment Helpers
    getRootComments(post: any): any[] {
        return (post?.comments || []).filter((c: any) => !c.parent_comment_id || c.parent_comment_id === 0);
    }

    getReplies(post: any, parentId: string | number): any[] {
        return (post?.comments || []).filter((c: any) => c.parent_comment_id === parentId);
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

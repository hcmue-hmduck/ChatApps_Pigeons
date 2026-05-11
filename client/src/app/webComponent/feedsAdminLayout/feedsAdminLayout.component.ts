import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { FeedStoreService } from '../../services/feedStore.service';

@Component({
	selector: 'feeds-admin-layout',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './feedsAdminLayout.component.html',
	styleUrl: './feedsAdminLayout.component.css'
})
export class FeedsAdminLayoutComponent implements OnInit, OnDestroy {
	feedStore = inject(FeedStoreService);
	searchTerm = signal('');
	typeFilter = signal<'all' | 'text' | 'link' | 'share' | 'media'>('all');
	privacyFilter = signal<'all' | 'public' | 'friends' | 'only_me' | 'custom'>('all');
	statusFilter = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');

	loading = computed(() => this.feedStore.loading());
	error = computed(() => this.feedStore.error() || '');
	expandedPosts = signal<Set<string>>(new Set());
	private readonly defaultFeedLimit = 10;



	stats = computed(() => {
		const posts = this.feedStore.posts();
		const visiblePosts = posts.filter((post: any) => !post.is_deleted);
		return [
			{ label: 'Total Posts', value: String(posts.length), icon: 'bi-file-earmark-post' },
			{ label: 'Visible Posts', value: String(visiblePosts.length), icon: 'bi-eye' },
			{ label: 'Shared Posts', value: String(posts.filter((post: any) => post.post_type === 'share').length), icon: 'bi-share' },
		];
	});

	filteredPosts = computed(() => {
		const term = this.searchTerm().trim().toLowerCase();
		const typeFilter = this.typeFilter();
		const privacyFilter = this.privacyFilter();
		const statusFilter = this.statusFilter();

		return this.feedStore.posts()
			.filter((post: any) => {
				const matchesTerm = !term || [
					post?.content,
					post?.user_infor?.full_name,
					post?.user_infor?.email,
					post?.location,
					post?.feeling
				].some((value) => String(value || '').toLowerCase().includes(term));

				const matchesType = typeFilter === 'all' || post.post_type === typeFilter;
				const matchesPrivacy = privacyFilter === 'all' || post.privacy === privacyFilter;
				const matchesStatus = statusFilter === 'all' || post.status === statusFilter;

				return matchesTerm && matchesType && matchesPrivacy && matchesStatus;
			})
			.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	});

	ngOnInit(): void {
		this.loadPosts();
	}

	ngOnDestroy(): void {
		this.feedStore.limit = this.defaultFeedLimit;
	}

	loadPosts() {
		this.feedStore.limit = 100;
		this.feedStore.isDataLoaded.set(false);
		this.feedStore.loadFeeds(false, 'all');
	}

	refresh() {
		this.loadPosts();
	}

	onSearchInput(value: string) {
		this.searchTerm.set(value);
	}



	deletePost(post: any) {
		if (!post?.id) return;

		Swal.fire({
			title: 'Xóa bài viết?',
			text: 'Bài viết sẽ bị ẩn khỏi bảng tin.',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Xóa',
			cancelButtonText: 'Hủy'
		}).then((result) => {
			if (!result.isConfirmed) return;

			this.feedStore.deletePost(post.id).subscribe({
				next: () => {
					this.feedStore.posts.update(list => list.filter((item: any) => item.id !== post.id));
				},
				error: (err: any) => {
					Swal.fire('Lỗi', err?.message || 'Không thể xóa bài viết', 'error');
				}
			});
		});
	}

	updatePostStatus(post: any, newStatus: string) {
		if (!post?.id) return;

		const actionText = newStatus === 'approved' ? 'Chấp nhận' : 'Ẩn';
		
		Swal.fire({
			title: `${actionText} bài viết?`,
			text: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} bài viết này?`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: actionText,
			cancelButtonText: 'Hủy'
		}).then((result) => {
			if (!result.isConfirmed) return;

			this.feedStore.updatePost(post.id, {
				postData: {
					status: newStatus
				},
				mediaData: null
			}).subscribe({
				next: (response: any) => {
					this.feedStore.posts.update(list => 
						list.map((item: any) => item.id === post.id ? { ...item, status: newStatus } : item)
					);
					Swal.fire('Thành công', `Đã ${actionText.toLowerCase()} bài viết`, 'success');
				},
				error: (err: any) => {
					Swal.fire('Lỗi', err?.message || `Không thể ${actionText.toLowerCase()} bài viết`, 'error');
				}
			});
		});
	}

	trackByPostId(_: number, post: any) {
		return post?.id;
	}

	getAuthorName(post: any): string {
		return post?.user_infor?.full_name || 'Người dùng';
	}

	getAuthorAvatar(post: any): string {
		return post?.user_infor?.avatar_url || 'assets/AvatarDefault.jpg';
	}

	getPostTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			text: 'Text',
			link: 'Link',
			share: 'Share',
			media: 'Media'
		};
		return labels[type] || type || 'Unknown';
	}

	getPrivacyLabel(privacy: string): string {
		const labels: Record<string, string> = {
			public: 'Công khai',
			friends: 'Bạn bè',
			only_me: 'Chỉ mình tôi',
			custom: 'Tuỳ chỉnh'
		};
		return labels[privacy] || privacy || 'Unknown';
	}

	getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			approved: 'Đã duyệt',
			rejected: 'Đã ẩn',
			pending: 'Chờ duyệt'
		};
		return labels[status] || status || 'Unknown';
	}

	formatTime(value: string | Date): string {
		if (!value) return '--';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--';
		return date.toLocaleString('vi-VN', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	getPostMedia(post: any): any[] {
		return post?.post_media || [];
	}

	getMediaItems(post: any): any[] {
		if (!post?.post_media || !Array.isArray(post.post_media)) return [];
		return post.post_media.filter((media: any) => media.media_type === 'image' || media.media_type === 'video');
	}

	getAttachmentItems(post: any): any[] {
		if (!post?.post_media || !Array.isArray(post.post_media)) return [];
		return post.post_media.filter((media: any) => media.media_type === 'file');
	}

	getStoredLinkPreview(post: any): any | null {
		if (!post?.post_media || !Array.isArray(post.post_media)) return null;

		const linkMedia = post.post_media.find((media: any) => media.media_type === 'link');
		if (!linkMedia) return null;

		return {
			url: linkMedia.media_url,
			title: linkMedia.file_name,
			image: linkMedia.thumbnail_url,
			description: linkMedia.link_description,
			siteName: linkMedia.link_site_name,
			hostname: ''
		};
	}

	toggleComments(postId: string) {
		this.expandedPosts.update((current) => {
			const next = new Set(current);
			if (next.has(postId)) {
				next.delete(postId);
			} else {
				next.add(postId);
			}
			return next;
		});
	}

	isCommentsExpanded(postId: string): boolean {
		return this.expandedPosts().has(postId);
	}

	getRootComments(post: any): any[] {
		return (post?.comments || []).filter((comment: any) => !comment.parent_comment_id || comment.parent_comment_id === 0);
	}

	getReplies(post: any, parentId: string | number): any[] {
		return (post?.comments || []).filter((comment: any) => comment.parent_comment_id === parentId);
	}

	getCommentAuthorName(comment: any): string {
		return comment?.user_infor?.full_name || 'Người dùng';
	}

	getCommentAuthorAvatar(comment: any): string {
		return comment?.user_infor?.avatar_url || 'assets/AvatarDefault.jpg';
	}
}

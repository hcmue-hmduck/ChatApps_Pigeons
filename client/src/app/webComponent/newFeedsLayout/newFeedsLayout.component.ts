import { Component, Input, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Feeds } from "../../services/feeds";
import { Emojis } from "../../services/emojis";
import { Comment } from '../../services/comment';
import { UploadService } from '../../services/uploadService';

@Component({
    selector: 'new-feeds-layout',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './newFeedsLayout.component.html',
    styleUrl: './newFeedsLayout.component.css'
})
export class NewFeedsLayoutComponent implements OnDestroy {
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.post-options-wrap')) {
            this.activeMenuPostId.set(null);
        }
    }

    constructor(
        private feedsService: Feeds,
        private emojisService: Emojis,
        private commentService: Comment,
        private uploadService: UploadService
    ) { }

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
    emojis = signal<any[]>([]);
    loading = signal(false);
    isPosting = signal(false);
    isUpdatingPost = signal(false);
    uploadProgress = signal(0);
    uploadStage = signal<'creating' | 'uploading' | 'saving'>('creating');
    activeMenuPostId = signal<string | null>(null);
    isEditModalOpen = signal(false);
    editingPost = signal<any>(null);
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

    newPostContent = '';
    newPostPrivacy = 'public';
    newPostFeeling = '';
    newPostLocation = '';
    selectedMediaFiles: File[] = [];
    selectedMediaPreviews: Array<{
        id: string;
        media_type: 'image' | 'video';
        media_url: string;
        width: number;
        height: number;
    }> = [];
    selectedAttachmentFiles: File[] = [];
    newCommentContent = '';
    replyToCommentId: string | null = null;
    newReplyContent = '';

    // Edit Post State
    editPostContent = '';
    editPostPrivacy = 'public';
    editPostFeeling = '';
    editPostLocation = '';
    editPostExistingMedia: any[] = [];
    editPostNewMediaFiles: File[] = [];
    editPostNewMediaPreviews: any[] = [];

    // Metadata signals
    provinces = signal<any[]>([]);

    // Lightbox State
    isLightboxOpen = false;
    selectedMediaPost: any = null;
    currentMediaIndex = 0;

    ngOnInit() {
        this.loadFeeds();
        this.loadMetadata();
    }

    ngOnDestroy() {
        this.clearSelectedMedia(false);
        this.clearEditNewMedia(false);
    }

    triggerImagePicker(input: HTMLInputElement) {
        input.click();
    }

    triggerAttachmentPicker(input: HTMLInputElement) {
        input.click();
    }

    triggerEditMediaPicker(input: HTMLInputElement) {
        input.click();
    }

    triggerEditAttachmentPicker(input: HTMLInputElement) {
        input.click();
    }

    onMediaSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        const mediaFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
        if (!mediaFiles.length) {
            input.value = '';
            return;
        }

        for (const file of mediaFiles) {
            const objectUrl = URL.createObjectURL(file);
            const previewId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const previewItem = {
                id: previewId,
                media_type: mediaType as 'image' | 'video',
                media_url: objectUrl,
                width: 1,
                height: 1
            };

            this.selectedMediaFiles.push(file);
            this.selectedMediaPreviews.push(previewItem);

            if (mediaType === 'image') {
                const img = new Image();
                img.onload = () => {
                    const target = this.selectedMediaPreviews.find(item => item.id === previewId);
                    if (target) {
                        target.width = img.naturalWidth || 1;
                        target.height = img.naturalHeight || 1;
                    }
                };
                img.src = objectUrl;
            } else {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    const target = this.selectedMediaPreviews.find(item => item.id === previewId);
                    if (target) {
                        target.width = video.videoWidth || 1;
                        target.height = video.videoHeight || 1;
                    }
                };
                video.src = objectUrl;
            }
        }

        input.value = '';
    }

    onAttachmentSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        const nonMediaFiles = files.filter(file => !(file.type.startsWith('image/') || file.type.startsWith('video/')));
        if (!nonMediaFiles.length) {
            input.value = '';
            return;
        }

        for (const file of nonMediaFiles) {
            const existed = this.selectedAttachmentFiles.some(
                item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
            );
            if (!existed) {
                this.selectedAttachmentFiles.push(file);
            }
        }

        input.value = '';
    }

    onEditMediaSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        const mediaFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
        for (const file of mediaFiles) {
            this.appendEditFilePreview(file);
        }

        input.value = '';
    }

    onEditAttachmentSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        const attachmentFiles = files.filter(file => !(file.type.startsWith('image/') || file.type.startsWith('video/')));
        for (const file of attachmentFiles) {
            this.appendEditFilePreview(file);
        }

        input.value = '';
    }

    appendEditFilePreview(file: File) {
        const previewId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
        const mediaType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file';
        const objectUrl = mediaType === 'file' ? '' : URL.createObjectURL(file);

        const previewItem: any = {
            id: previewId,
            is_new: true,
            media_type: mediaType,
            media_url: objectUrl,
            width: 1,
            height: 1,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
        };

        this.editPostNewMediaFiles.push(file);
        this.editPostNewMediaPreviews.push(previewItem);

        if (mediaType === 'image') {
            const img = new Image();
            img.onload = () => {
                const target = this.editPostNewMediaPreviews.find(item => item.id === previewId);
                if (target) {
                    target.width = img.naturalWidth || 1;
                    target.height = img.naturalHeight || 1;
                }
            };
            img.src = objectUrl;
        }

        if (mediaType === 'video') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const target = this.editPostNewMediaPreviews.find(item => item.id === previewId);
                if (target) {
                    target.width = video.videoWidth || 1;
                    target.height = video.videoHeight || 1;
                }
            };
            video.src = objectUrl;
        }
    }

    removeSelectedMedia(previewId: string) {
        const index = this.selectedMediaPreviews.findIndex(item => item.id === previewId);
        if (index === -1) return;

        URL.revokeObjectURL(this.selectedMediaPreviews[index].media_url);
        this.selectedMediaPreviews.splice(index, 1);
        this.selectedMediaFiles.splice(index, 1);
    }

    clearSelectedMedia(resetInput = true) {
        for (const preview of this.selectedMediaPreviews) {
            URL.revokeObjectURL(preview.media_url);
        }
        this.selectedMediaFiles = [];
        this.selectedMediaPreviews = [];

        if (resetInput) {
            const imageInput = document.getElementById('create-post-image-input') as HTMLInputElement | null;
            if (imageInput) imageInput.value = '';
        }
    }

    removeSelectedAttachment(index: number) {
        if (index < 0 || index >= this.selectedAttachmentFiles.length) return;
        this.selectedAttachmentFiles.splice(index, 1);
    }

    clearSelectedAttachments() {
        this.selectedAttachmentFiles = [];
        const attachmentInput = document.getElementById('create-post-attachment-input') as HTMLInputElement | null;
        if (attachmentInput) attachmentInput.value = '';
    }

    removeEditExistingMedia(mediaId: string) {
        this.editPostExistingMedia = this.editPostExistingMedia.filter(item => item.id !== mediaId);
    }

    removeEditNewMedia(previewId: string) {
        const index = this.editPostNewMediaPreviews.findIndex(item => item.id === previewId);
        if (index === -1) return;

        const target = this.editPostNewMediaPreviews[index];
        if (target?.media_url) {
            URL.revokeObjectURL(target.media_url);
        }

        this.editPostNewMediaPreviews.splice(index, 1);
        this.editPostNewMediaFiles.splice(index, 1);
    }

    clearEditNewMedia(resetInput = true) {
        for (const preview of this.editPostNewMediaPreviews) {
            if (preview?.media_url) {
                URL.revokeObjectURL(preview.media_url);
            }
        }

        this.editPostNewMediaFiles = [];
        this.editPostNewMediaPreviews = [];

        if (resetInput) {
            const mediaInput = document.getElementById('edit-post-media-input') as HTMLInputElement | null;
            const attachmentInput = document.getElementById('edit-post-attachment-input') as HTMLInputElement | null;
            if (mediaInput) mediaInput.value = '';
            if (attachmentInput) attachmentInput.value = '';
        }
    }

    getEditPreviewMediaItems(): any[] {
        return this.editPostNewMediaPreviews.filter(item => item.media_type === 'image' || item.media_type === 'video');
    }

    getEditPreviewAttachmentItems(): any[] {
        return this.editPostNewMediaPreviews.filter(item => item.media_type === 'file');
    }

    getEditExistingMediaItems(): any[] {
        return this.editPostExistingMedia.filter(item => item.media_type === 'image' || item.media_type === 'video');
    }

    getEditExistingAttachmentItems(): any[] {
        return this.editPostExistingMedia.filter(item => item.media_type === 'file');
    }

    getAttachmentIconClassByMimeType(type: string): string {
        const mime = type || '';
        if (mime.startsWith('image/')) return 'bi-file-earmark-image';
        if (mime.startsWith('video/')) return 'bi-file-earmark-play';
        if (mime.includes('pdf')) return 'bi-file-earmark-pdf';
        if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return 'bi-file-earmark-zip';
        if (mime.includes('word') || mime.includes('document')) return 'bi-file-earmark-word';
        if (mime.includes('sheet') || mime.includes('excel') || mime.includes('spreadsheet')) return 'bi-file-earmark-spreadsheet';
        return 'bi-file-earmark';
    }

    formatFileSize(bytes: number): string {
        if (!bytes && bytes !== 0) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(1)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(1)} GB`;
    }

    getFileExtension(filename: string): string {
        const parts = filename.split('.');
        if (parts.length < 2) return 'FILE';
        return parts[parts.length - 1].toUpperCase();
    }

    getAttachmentIconClass(file: File): string {
        const type = file.type || '';
        if (type.startsWith('image/')) return 'bi-file-earmark-image';
        if (type.startsWith('video/')) return 'bi-file-earmark-play';
        if (type.includes('pdf')) return 'bi-file-earmark-pdf';
        if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return 'bi-file-earmark-zip';
        if (type.includes('word') || type.includes('document')) return 'bi-file-earmark-word';
        if (type.includes('sheet') || type.includes('excel') || type.includes('spreadsheet')) return 'bi-file-earmark-spreadsheet';
        return 'bi-file-earmark';
    }

    getCreatorMediaLayoutClass(): string {
        return this.getMediaLayoutClass({ post_media: this.selectedMediaPreviews });
    }

    openCreatorMediaPreview(index: number) {
        if (!this.selectedMediaPreviews.length) return;
        this.openLightbox({ post_media: this.selectedMediaPreviews }, index);
    }

    loadMetadata() {
        // Load Emojis
        this.emojisService.getEmojis().subscribe({
            next: (data) => {
                const emojisList = data.metadata?.emojis || [];
                this.emojis.set(emojisList);
                console.log('Emojis loaded:', emojisList);
            },
            error: (err) => console.error('Error loading emojis:', err)
        });

        // Load Provinces
        this.feedsService.getProvinces().subscribe({
            next: (data) => {
                this.provinces.set(data);
                console.log('Provinces loaded:', data.length);
            },
            error: (err) => console.error('Error loading provinces:', err)
        });
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
                console.log('Feeds loaded successfully:', data.metadata.homePosts);
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
        return comment?.user_infor?.full_name;
    }

    getCommentAuthorAvatar(comment: any): string {
        return comment?.user_infor?.avatar_url;
    }

    getMediaLayoutClass(post: any): string {
        const medias = this.getMediaItems(post);
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
        // Store only media items (not attachments) in lightbox
        const mediaItems = this.getMediaItems(post);
        this.selectedMediaPost = {
            ...post,
            post_media: mediaItems
        };
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

    formatPostType(type: string): string {
        switch (type) {
            case 'news_media': return 'Phương tiện';
            case 'news_text': return 'Văn bản';
            case 'news_file': return 'Tệp tin';
            default: return 'Bản tin';
        }
    }

    isUserPost(post_user: string): boolean {
        return post_user === this._userInfor?.id;
    }

    toggleMenu(post: any, event: Event) {
        console.log('Data Post', post);
        event.stopPropagation();
        if (this.activeMenuPostId() === post.id) {
            this.activeMenuPostId.set(null);
        } else {
            this.activeMenuPostId.set(post.id);
        }
    }

    openEditPost(post: any) {
        if (!post) return;

        this.activeMenuPostId.set(null);
        this.editingPost.set(post);
        this.editPostContent = post.content || '';
        this.editPostPrivacy = post.privacy || 'public';
        this.editPostFeeling = post.feeling || '';
        this.editPostLocation = post.location || '';
        this.editPostExistingMedia = Array.isArray(post.post_media) ? [...post.post_media] : [];
        this.editPostNewMediaFiles = [];
        this.editPostNewMediaPreviews = [];
        this.isEditModalOpen.set(true);
    }

    closeEditPostModal() {
        this.isEditModalOpen.set(false);
        this.editingPost.set(null);
        this.editPostContent = '';
        this.editPostPrivacy = 'public';
        this.editPostFeeling = '';
        this.editPostLocation = '';
        this.editPostExistingMedia = [];
        this.clearEditNewMedia();
        this.isUpdatingPost.set(false);
    }

    normalizeUploadedMediaItem(media: any): any {
        const mediaType = media?.resource_type === 'raw' ? 'file' : media?.resource_type;
        return {
            id: media?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            media_type: mediaType,
            media_url: mediaType === 'file' ? (media?.download_url || media?.url) : media?.url,
            thumbnail_url: media?.thumbnail_url,
            duration: media?.duration || 0,
            file_name: media?.file_name,
            file_size: media?.file_size,
            width: media?.width || 1,
            height: media?.height || 1
        };
    }

    mapExistingMediaToUpdatePayload(media: any): any {
        const isFile = media?.media_type === 'file';
        return {
            resource_type: isFile ? 'raw' : media?.media_type,
            url: media?.media_url,
            download_url: isFile ? media?.media_url : undefined,
            thumbnail_url: media?.thumbnail_url,
            duration: media?.duration || 0,
            file_name: media?.file_name,
            file_size: media?.file_size
        };
    }

    saveEditedPostLocal() {
        const current = this.editingPost();
        if (!current || this.isUpdatingPost()) return;

        const previousPost = {
            ...current,
            post_media: Array.isArray(current.post_media) ? [...current.post_media] : []
        };

        const updatedPost = {
            ...current,
            content: this.editPostContent.trim(),
            privacy: this.editPostPrivacy,
            feeling: this.editPostFeeling,
            location: this.editPostLocation,
            updated_at: new Date().toISOString()
        };

        const postData = {
            content: updatedPost.content,
            privacy: updatedPost.privacy,
            feeling: updatedPost.feeling,
            location: updatedPost.location
        };

        const existingPayload = this.editPostExistingMedia.map(media => this.mapExistingMediaToUpdatePayload(media));
        const savePostUpdate = (mediaPayload: any[], finalPostMedia: any[]) => {
            const optimisticPost = {
                ...updatedPost,
                post_media: finalPostMedia
            };

            this.posts.update(prev => prev.map(post => post.id === current.id ? optimisticPost : post));
            this.isUpdatingPost.set(true);

            this.feedsService.updatePost(current.id, { postData, mediaData: mediaPayload }).subscribe({
                next: () => {
                    this.closeEditPostModal();
                },
                error: (err) => {
                    this.posts.update(prev => prev.map(post => post.id === current.id ? previousPost : post));
                    this.isUpdatingPost.set(false);
                    console.error('Error updating post:', err);
                    this.error.set('Cập nhật bài viết thất bại. Vui lòng thử lại.');
                }
            });
        };

        if (this.editPostNewMediaFiles.length === 0) {
            savePostUpdate(existingPayload, [...this.editPostExistingMedia]);
            return;
        }

        const formData = new FormData();
        for (const file of this.editPostNewMediaFiles) {
            formData.append('files', file);
        }

        this.isUpdatingPost.set(true);
        this.uploadService.uploadFileFeedsWithProgress(current.id, formData).subscribe({
            next: (event) => {
                if (event.type !== HttpEventType.Response) return;

                const uploadedFiles = event.body?.metadata?.files || [];
                const uploadedPostMedia = uploadedFiles.map((item: any) => this.normalizeUploadedMediaItem(item));
                const combinedMedia = [...this.editPostExistingMedia, ...uploadedPostMedia];
                const mediaPayload = [...existingPayload, ...uploadedFiles];

                savePostUpdate(mediaPayload, combinedMedia);
            },
            error: (err) => {
                this.isUpdatingPost.set(false);
                console.error('Error uploading files for post update:', err);
                this.error.set('Upload file khi chỉnh sửa thất bại. Vui lòng thử lại.');
            }
        });
    }

    onDeletePost(postId: string) {
        if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

        this.feedsService.deletePost(postId).subscribe({
            next: () => {
                this.posts.update(prev => prev.filter(p => p.id !== postId));
                this.activeMenuPostId.set(null);
                console.log('Post deleted successfully:', postId);
            },
            error: (err) => {
                console.error('Error deleting post:', err);
                this.error.set('Xóa bài viết thất bại. Vui lòng thử lại.');
            }
        });
    }

    handlePostFeed() {
        const content = this.newPostContent.trim();
        if (!content && this.selectedMediaFiles.length === 0 && this.selectedAttachmentFiles.length === 0) return;
        if (this.isPosting()) return;

        const userId = this._userInfor?.id;
        if (!userId) {
            console.error('User information not available');
            return;
        }

        const formData = new FormData();
        for (const file of this.selectedMediaFiles) formData.append('files', file);
        for (const file of this.selectedAttachmentFiles) formData.append('files', file);

        const postData = {
            user_id: userId,
            content: content,
            post_type: content ? 'text' : 'media',
            privacy: this.newPostPrivacy,
            feeling: this.newPostFeeling,
            location: this.newPostLocation
        };

        const hasFiles = this.selectedMediaFiles.length > 0 || this.selectedAttachmentFiles.length > 0;
        this.isPosting.set(true);
        this.uploadProgress.set(0);
        this.uploadStage.set('creating');

        const resetComposer = () => {
            this.newPostContent = '';
            this.newPostFeeling = '';
            this.newPostPrivacy = 'public';
            this.newPostLocation = '';
            this.clearSelectedMedia();
            this.clearSelectedAttachments();
        };

        const finishPosting = (shouldReset: boolean) => {
            if (shouldReset) resetComposer();
            this.isPosting.set(false);
            this.uploadProgress.set(0);
            this.uploadStage.set('creating');
        };

        this.feedsService.createNewPost(postData).subscribe({
            next: (data) => {
                data.metadata.newPost.user_infor = this._userInfor;
                const newPost = data.metadata.newPost;
                console.log('Post created successfully:', newPost);

                const rollbackCreatedPost = () => {
                    this.feedsService.deletePost(newPost.id).subscribe({
                        next: () => {
                            console.log('Rollback post success:', newPost.id);
                        },
                        error: (rollbackErr) => {
                            console.error('Rollback post failed:', rollbackErr);
                            this.error.set('Đăng bài thất bại và rollback không thành công. Vui lòng kiểm tra dữ liệu.');
                        }
                    });
                };

                if (!hasFiles) {
                    newPost.post_media = [];
                    this.posts.update(prev => [newPost, ...prev]);
                    finishPosting(true);
                    return;
                }

                this.uploadStage.set('uploading');
                this.uploadService.uploadFileFeedsWithProgress(newPost.id, formData).subscribe({
                    next: (event) => {
                        if (event.type === HttpEventType.UploadProgress) {
                            const total = event.total || 0;
                            if (total > 0) {
                                const progress = Math.round((event.loaded / total) * 100);
                                this.uploadProgress.set(Math.min(progress, 97));
                            }
                            return;
                        }

                        if (event.type === HttpEventType.Response) {
                            this.uploadProgress.set(98);
                            this.uploadStage.set('saving');

                            const uploaded = event.body;
                            console.log('Files uploaded successfully:', uploaded);
                            this.feedsService.createNewMediaPost(newPost.id, uploaded.metadata.files).subscribe({
                                next: (mediaResponse) => {
                                    console.log('Media post created successfully:', mediaResponse);
                                    newPost.post_media = mediaResponse.metadata.newMediaPost;
                                    this.posts.update(prev => [newPost, ...prev]);
                                    this.uploadProgress.set(100);
                                    finishPosting(true);
                                },
                                error: (err) => {
                                    console.error('Error creating media post:', err);
                                    this.error.set('Tạo media bài viết thất bại. Vui lòng thử lại.');
                                    rollbackCreatedPost();
                                    finishPosting(false);
                                }
                            });
                        }
                    },
                    error: (err) => {
                        console.error('Error uploading files:', err);
                        this.error.set('Upload file thất bại. Vui lòng thử lại.');
                        rollbackCreatedPost();
                        finishPosting(false);
                    }
                });
            },
            error: (err) => {
                console.error('Error creating post:', err);
                this.error.set('Tạo bài viết thất bại. Vui lòng thử lại.');
                finishPosting(false);
            }
        });
    }

    sendComment(postId: string, parentCommentId: string | null = null) {
        const content = parentCommentId ? this.newReplyContent.trim() : this.newCommentContent.trim();
        if (!content) return;

        const commentData = {
            content: content,
            user_id: this._userInfor?.id,
            post_id: postId,
            parent_comment_id: parentCommentId || null
        };

        console.log('Sending comment:', commentData);

        this.commentService.createComment(postId, commentData).subscribe({
            next: (data: any) => {
                console.log('Comment created successfully:', data.metadata.newComment);
                data.metadata.newComment.user_infor = this._userInfor;

                this.posts.update(prev => prev.map(post => {
                    if (post.id === postId) {
                        return { ...post, comments: [...post.comments, data.metadata.newComment] };
                    }
                    return post;
                }));

                if (parentCommentId) {
                    this.newReplyContent = '';
                    this.replyToCommentId = null;
                } else {
                    this.newCommentContent = '';
                }
            },
            error: (err: any) => {
                console.error('Error creating comment:', err);
            }
        });
    }

    toggleReply(commentId: string) {
        if (this.replyToCommentId === commentId) {
            this.replyToCommentId = null;
        } else {
            this.replyToCommentId = commentId;
            this.newReplyContent = '';
        }
    }

    viewAttachmentInGoogle(attachment: any) {
        const mediaUrl = String(attachment?.media_url || '').trim();
        if (!mediaUrl) return;

        const normalizedUrl = /^https?:\/\//i.test(mediaUrl) ? mediaUrl : `https://${mediaUrl}`;
        const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(normalizedUrl)}`;
        window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    }

    getFileName(url: string): string {
        if (!url) return 'download';
        // Extract filename from URL
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        // Remove query parameters if any
        return lastPart.split('?')[0] || 'download';
    }

    getAttachmentDisplayName(attachment: any): string {
        const dbName = String(attachment?.file_name || '').trim();
        if (dbName) return dbName;
        return this.getFileName(String(attachment?.media_url || ''));
    }

    // Filter media items (images and videos only)
    getMediaItems(post: any): any[] {
        if (!post.post_media || !Array.isArray(post.post_media)) return [];
        return post.post_media.filter((media: any) =>
            media.media_type === 'image' || media.media_type === 'video'
        );
    }

    // Filter attachment items (files only)
    getAttachmentItems(post: any): any[] {
        if (!post.post_media || !Array.isArray(post.post_media)) return [];
        return post.post_media.filter((media: any) => media.media_type === 'file');
    }
}

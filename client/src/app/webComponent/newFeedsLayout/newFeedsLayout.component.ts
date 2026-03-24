import { Component, Input, signal, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, inject, CUSTOM_ELEMENTS_SCHEMA, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Feeds } from "../../services/feeds";
import { FeedReactions } from '../../services/feedreactions';
import { Emojis } from "../../services/emojis";
import { Comment } from '../../services/comment';
import { UploadService } from '../../services/uploadService';
import { FileUtils } from '../../utils/FileUtils/fileUltils';
import { DateTimeUtils } from '../../utils/DateTimeUtils/datetimeUtils';
import { SocketService } from '../../services/socket';
import { LinkPreviewUtils } from '../../utils/LinkUtils/linkPreviewUtils';
import Swal from 'sweetalert2';

@Component({
    selector: 'new-feeds-layout',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './newFeedsLayout.component.html',
    styleUrl: './newFeedsLayout.component.css'
})
export class NewFeedsLayoutComponent implements AfterViewInit, OnDestroy {
    @ViewChild('feedMain') feedMain!: ElementRef;
    @ViewChild('scrollSentinel') scrollSentinel!: ElementRef;
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
        private feedReaction: FeedReactions,
        private uploadService: UploadService,
        public fileUtils: FileUtils,
        public dateTimeUtils: DateTimeUtils,
        private socketService: SocketService,
        private linkPreviewUtils: LinkPreviewUtils,
        private cdr: ChangeDetectorRef
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
    activeLinkPreview: any | null = null;
    editLinkPreview: any | null = null;
    shareLinkPreview: any | null = null;
    activeMenuPostId = signal<string | null>(null);
    isEditModalOpen = signal(false);
    isShareModalOpen = signal(false);
    editingPost = signal<any>(null);
    sharingPost = signal<any>(null);
    shareContent = signal('');
    sharePrivacy = signal('public');
    shareLocation = signal('');
    shareFeeling = signal('');
    error = signal<string | null>(null);
    offset = signal(0);
    limit = 10;
    hasMore = signal(true);
    loadingMore = signal(false);
    private ngZone = inject(NgZone);
    private timeUpdateInterval: any;

    // Reaction system
    reactions = [
        { id: 'like', icon: '👍', label: 'Thích', color: '#00f2ff', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/lottie.json' },
        { id: 'love', icon: '❤️', label: 'Yêu thích', color: '#ff3d71', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/lottie.json' },
        { id: 'care', icon: '🥰', label: 'Thương thương', color: '#f7b125', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f917/lottie.json' },
        { id: 'haha', icon: '😂', label: 'Haha', color: '#ffaa00', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/lottie.json' },
        { id: 'wow', icon: '😮', label: 'Wow', color: '#00d68f', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/lottie.json' },
        { id: 'sad', icon: '😢', label: 'Buồn', color: '#3366ff', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/lottie.json' },
        { id: 'angry', icon: '😡', label: 'Phẫn nộ', color: '#ff3d71', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/lottie.json' }
    ];
    reactionPosition = signal<'top' | 'bottom'>('top');

    checkReactionPosition(event: MouseEvent) {
        const threshold = 120; // Required space in pixels
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        if (rect.top < threshold) {
            this.reactionPosition.set('bottom');
        } else {
            this.reactionPosition.set('top');
        }
    }

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
    expandedContentIds = signal<Set<string>>(new Set());
    private observer: IntersectionObserver | null = null;

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
        this.setupSocketListener();

        // Local realtime updates tick every 60s
        this.ngZone.runOutsideAngular(() => {
            this.timeUpdateInterval = setInterval(() => {
                this.cdr.detectChanges();
            }, 60000);
        });
    }

    ngAfterViewInit() {
        this.initIntersectionObserver();
    }

    private initIntersectionObserver() {
        if (!this.scrollSentinel) return;

        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.loadFeeds(true);
            }
        }, {
            root: this.feedMain.nativeElement,
            rootMargin: '150px',
            threshold: 0.1
        });

        this.observer.observe(this.scrollSentinel.nativeElement);
    }

    ngOnDestroy() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        if (this.observer) {
            this.observer.disconnect();
        }
        this.clearSelectedMedia(false);
        this.clearEditNewMedia(false);
        this.socketService.off('newPost');
    }

    triggerAttachmentPicker(input: HTMLInputElement) {
        input.click();
    }

    triggerEditAttachmentPicker(input: HTMLInputElement) {
        input.click();
    }

    setupSocketListener() {
        this.socketService.on('updateProfile', (data: any) => {
            // Update local user info if it's the current user
            if (this._userInfor?.id === data.id) {
                this.userInfor = data;
            }

            // Update all posts and comments metadata real-time
            this.posts.update(posts => posts.map(post => {
                let hasChanges = false;
                let updatedPost = { ...post };

                // 1. Update post author
                if (post.user_id === data.id) {
                    updatedPost.user_infor = { ...post.user_infor, ...data };
                    hasChanges = true;
                }

                // 2. Update all comments by this user
                if (Array.isArray(post.comments)) {
                    const originalComments = post.comments;
                    const updatedComments = originalComments.map((c: any) =>
                        c.user_id === data.id
                            ? { ...c, user_infor: { ...c.user_infor, ...data } }
                            : c
                    );

                    if (updatedComments !== originalComments) {
                        updatedPost.comments = updatedComments;
                        hasChanges = true;
                    }
                }

                return hasChanges ? updatedPost : post;
            }));
        });


        this.socketService.on('newPost', (data: any) => {
            console.log('Received newPost event on server:', data);
            if (data.shared_post) {
                this.posts.update(posts => posts.map(post => {
                    if (post.id === data.shared_post.id) {
                        console.log('update share count', post);
                        return { ...post, shares_count: data.shared_post.shares_count };
                    }
                    return post;
                }));
            }

            this.posts.update(posts => {
                if (posts.some(p => p.id === data.id)) {
                    return posts;
                }
                return [data, ...posts];
            });
        });

        this.socketService.on('updatePost', (data: any) => {
            console.log('Received updatePost event on server:', data);
            this.posts.update(posts => {
                return posts.map(post => {
                    if (post.id === data.id) return data;
                    if (post.shared_post && post.shared_post.id === data.id) {
                        return { ...post, shared_post: data };
                    }
                    return post;
                });
            });
        });

        this.socketService.on('deletePost', (data: any) => {
            this.posts.update(posts => {
                return posts.filter(post => post.id !== data.id).map(post => {
                    if (post.shared_post && post.shared_post.id === data.id) {
                        return {
                            ...post,
                            shared_post: { ...post.shared_post, is_deleted: true }
                        };
                    }
                    return post;
                });
            });
        });

        this.socketService.on('newComment', (data) => {
            console.log('Received newComment event on server:', data);
            this.posts.update(posts => posts.map(post => {
                if (post.id === data.post_id) {
                    post.comments_count++;
                    return { ...post, comments: [...post.comments, data] };
                }
                return post;
            }));
        });

        this.socketService.on('PostReact', (data: any) => {
            console.log('Received PostReact event from socket:', data);
            const { type, postId, userId, reaction, reactionId } = data;

            this.posts.update(prev => prev.map(p => {
                if (p.id !== postId) return p;

                if (type === 'add') {
                    // Prevent duplicate if already added via local optimistic update
                    if (p.reactions?.some((r: any) => r.id === reaction.id)) return p;
                    return {
                        ...p,
                        reactions: [...(p.reactions || []), reaction],
                        likes_count: (p.likes_count || 0) + 1
                    };
                } else if (type === 'remove') {
                    return {
                        ...p,
                        reactions: p.reactions.filter((r: any) => r.id !== reactionId && r.user_id !== userId),
                        likes_count: Math.max(0, (p.likes_count || 0) - 1)
                    };
                }
                return p;
            }));
        });
    }

    onAttachmentSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        for (const file of files) {
            const validation = this.fileUtils.validateFileSize(file);
            if (!validation.valid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tệp quá lớn',
                    text: validation.message,
                    confirmButtonColor: '#00f2ff',
                    background: '#06131f',
                    color: '#fff'
                });
                continue;
            }

            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                // Handle as Media
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
            } else {
                // Handle as Attachment
                const existed = this.selectedAttachmentFiles.some(
                    item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
                );
                if (!existed) {
                    this.selectedAttachmentFiles.push(file);
                }
            }
        }

        input.value = '';
    }

    onEditAttachmentSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files || []);
        if (!files.length) return;

        for (const file of files) {
            this.appendEditFilePreview(file);
        }

        input.value = '';
    }

    appendEditFilePreview(file: File) {
        const validation = this.fileUtils.validateFileSize(file);
        if (!validation.valid) {
            Swal.fire({
                icon: 'warning',
                title: 'Tệp quá lớn',
                text: validation.message,
                confirmButtonColor: '#00f2ff',
                background: '#06131f',
                color: '#fff'
            });
            return;
        }
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
            const attachmentInput = document.getElementById('create-post-attachment-input') as HTMLInputElement | null;
            if (attachmentInput) attachmentInput.value = '';
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
            const attachmentInput = document.getElementById('edit-post-attachment-input') as HTMLInputElement | null;
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

    toggleContent(postId: string) {
        this.expandedContentIds.update(ids => {
            const newIds = new Set(ids);
            if (newIds.has(postId)) {
                newIds.delete(postId);
            } else {
                newIds.add(postId);
            }
            return newIds;
        });
    }

    isContentExpanded(postId: string): boolean {
        return this.expandedContentIds().has(postId);
    }

    shouldShowSeeMore(content: string | null | undefined): boolean {
        if (!content) return false;
        return content.length > 300;
    }

    loadFeeds(isLoadMore: boolean = false) {
        if (isLoadMore) {
            if (!this.hasMore() || this.loadingMore() || this.loading()) return;
            this.loadingMore.set(true);
        } else {
            this.loading.set(true);
            this.offset.set(0);
            this.hasMore.set(true);
        }
        this.error.set(null);

        this.feedsService.getFeeds(this.limit, this.offset()).subscribe({
            next: (data) => {
                const homePosts = data.metadata.homePosts || [];
                if (isLoadMore) {
                    this.posts.update(prev => [...prev, ...homePosts]);
                    this.loadingMore.set(false);
                } else {
                    this.posts.set(homePosts);
                    this.loading.set(false);
                    // Scroll to top only on initial load
                    setTimeout(() => {
                        if (this.feedMain) {
                            this.feedMain.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    });
                }

                this.offset.update(old => old + homePosts.length);
                if (homePosts.length < this.limit) {
                    this.hasMore.set(false);
                }
            },
            error: (err) => {
                console.error('Error loading feeds:', err);
                this.error.set('Failed to load feeds. Please try again later.');
                this.loading.set(false);
                this.loadingMore.set(false);
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

    getStoredLinkPreview(post: any): any | null {
        if (!post) return null;

        // 1. Check if there's a stored link preview in post_media
        if (post.post_media && Array.isArray(post.post_media)) {
            const linkMedia = post.post_media.find((m: any) => m.media_type === 'link');
            if (linkMedia) {
                return {
                    url: linkMedia.media_url,
                    title: linkMedia.file_name,
                    image: linkMedia.thumbnail_url,
                    description: linkMedia.link_description,
                    siteName: linkMedia.link_site_name,
                    hostname: ''
                };
            }
        }

        return null;
    }

    closedNewPreviewUrls = new Set<string>();
    closedEditPreviewUrls = new Set<string>();

    getLinkPreview(content: string, type: 'new' | 'edit' | 'share' = 'new'): any | null {
        if (!content) {
            if (type === 'new') this.activeLinkPreview = null;
            else if (type === 'edit') this.editLinkPreview = null;
            else if (type === 'share') this.shareLinkPreview = null;
            return null;
        }

        const url = this.linkPreviewUtils.extractFirstUrl(content);
        let isHidden = false;

        if (url) {
            const targetSet = type === 'new' ? this.closedNewPreviewUrls :
                type === 'edit' ? this.closedEditPreviewUrls : null;

            if (targetSet) {
                for (const closedUrl of targetSet) {
                    if (closedUrl.includes(url) || url.includes(closedUrl)) {
                        isHidden = true;
                        break;
                    }
                }
            }
        }

        const previewData = this.linkPreviewUtils.getLinkPreview(content, (preview) => {
            if (type === 'new') this.activeLinkPreview = preview;
            else if (type === 'edit') this.editLinkPreview = preview;
            else if (type === 'share') this.shareLinkPreview = preview;
            this.cdr.markForCheck();
        });

        if (isHidden) return null;

        return previewData;
    }

    clearLinkPreview() {
        const url = this.linkPreviewUtils.extractFirstUrl(this.newPostContent);
        if (url) {
            this.closedNewPreviewUrls.add(url);
            this.cdr.markForCheck();
        }
    }

    clearEditLinkPreview() {
        const url = this.linkPreviewUtils.extractFirstUrl(this.editPostContent);
        if (url) {
            this.closedEditPreviewUrls.add(url);
            this.cdr.markForCheck();
        }
    }

    clearShareLinkPreview() {
        this.shareLinkPreview = null;
    }

    formatPostTime(dateValue: string | null | undefined): string {
        return this.dateTimeUtils.formatPostTime(dateValue);
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
        const preview = this.getStoredLinkPreview(post);
        this.editLinkPreview = preview;
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
        this.closedEditPreviewUrls.clear();
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
            file_size: media?.file_size,
            link_description: media?.link_description,
            link_site_name: media?.link_site_name
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
            location: updatedPost.location,
            post_type: (this.editLinkPreview) ? 'link' : (updatedPost.content ? 'text' : 'media')
        };

        const existingPayload = this.editPostExistingMedia
            .filter(media => media.media_type !== 'link') // Remove old link preview from existing media if present
            .map(media => this.mapExistingMediaToUpdatePayload(media));

        if (this.editLinkPreview) {
            existingPayload.push({
                resource_type: 'link',
                url: this.editLinkPreview.url,
                thumbnail_url: this.editLinkPreview.image,
                file_name: this.editLinkPreview.title,
                link_description: this.editLinkPreview.description,
                link_site_name: this.editLinkPreview.siteName
            });
        }
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
                    this.socketService.emit('updatePost', optimisticPost);
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
            const finalPostMedia = [...this.editPostExistingMedia].filter(m => m.media_type !== 'link');
            if (this.editLinkPreview) {
                finalPostMedia.push({
                    media_type: 'link',
                    media_url: this.editLinkPreview.url,
                    thumbnail_url: this.editLinkPreview.image,
                    file_name: this.editLinkPreview.title,
                    link_description: this.editLinkPreview.description,
                    link_site_name: this.editLinkPreview.siteName
                });
            }
            savePostUpdate(existingPayload, finalPostMedia);
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
                const finalMediaPayload = [...existingPayload, ...uploadedFiles];
                const finalPostMedia = [
                    ...this.editPostExistingMedia.filter(m => m.media_type !== 'link'),
                    ...uploadedPostMedia
                ];

                if (this.editLinkPreview) {
                    finalPostMedia.push({
                        media_type: 'link',
                        media_url: this.editLinkPreview.url,
                        thumbnail_url: this.editLinkPreview.image,
                        file_name: this.editLinkPreview.title,
                        link_description: this.editLinkPreview.description,
                        link_site_name: this.editLinkPreview.siteName
                    });
                }

                savePostUpdate(finalMediaPayload, finalPostMedia);
            },
            error: (err) => {
                this.isUpdatingPost.set(false);
                console.error('Error uploading files for post update:', err);
                this.error.set('Upload file khi chỉnh sửa thất bại. Vui lòng thử lại.');
            }
        });
    }

    onDeletePost(postId: string) {
        Swal.fire({
            title: 'Xóa bài viết?',
            text: 'Bạn có chắc chắn muốn xóa bài viết này không?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#00f2ff',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
            background: '#06131f',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                this.feedsService.deletePost(postId).subscribe({
                    next: () => {
                        this.socketService.emit('deletePost', { id: postId });
                        this.posts.update(prev => prev.filter(p => p.id !== postId).map(post => {
                            if (post.shared_post && post.shared_post.id === postId) {
                                return { ...post, shared_post: { ...post.shared_post, is_deleted: true } };
                            }
                            return post;
                        }));
                        this.activeMenuPostId.set(null);
                        console.log('Post deleted successfully:', postId);
                    },
                    error: (err) => {
                        console.error('Error deleting post:', err);
                        this.error.set('Xóa bài viết thất bại. Vui lòng thử lại.');
                    }
                });
            }
        });
    }

    async handlePostFeed() {
        const content = this.newPostContent.trim();
        const hasFiles = this.selectedMediaFiles.length > 0 || this.selectedAttachmentFiles.length > 0;

        if (!content && !hasFiles) return;
        if (this.isPosting()) return;

        const userId = this._userInfor?.id;
        if (!userId) return;

        this.isPosting.set(true);
        this.uploadProgress.set(0);
        this.uploadStage.set('creating');

        // 1. Chờ lấy Preview trước để xác định chính xác post_type
        const linkPreview = await this.linkPreviewUtils.getLinkPreviewAsync(content);

        const postData = {
            user_id: userId,
            content: content || null,
            post_type: linkPreview ? 'link' : (hasFiles ? 'media' : 'text'),
            privacy: this.newPostPrivacy,
            feeling: this.newPostFeeling,
            location: this.newPostLocation
        };

        const resetComposer = () => {
            this.newPostContent = '';
            this.newPostFeeling = '';
            this.newPostPrivacy = 'public';
            this.newPostLocation = '';
            this.clearSelectedMedia();
            this.clearSelectedAttachments();
            this.activeLinkPreview = null;
            this.closedNewPreviewUrls.clear();
        };

        const finishPosting = (shouldReset: boolean) => {
            if (shouldReset) resetComposer();
            this.isPosting.set(false);
            this.uploadProgress.set(0);
            this.uploadStage.set('creating');
        };

        this.feedsService.createNewPost(postData).subscribe({
            next: (data) => {
                const newPost = data.metadata.newPost;
                newPost.user_infor = this._userInfor;

                const rollbackCreatedPost = () => {
                    this.feedsService.deletePost(newPost.id).subscribe({
                        next: () => console.log('Rollback success:', newPost.id),
                        error: (err) => console.error('Rollback failed:', err)
                    });
                };

                const finalizePost = (media: any[] = []) => {
                    const enrichedPost = {
                        ...newPost,
                        comments: [],
                        post_media: media,
                        comments_count: 0,
                        likes_count: 0,
                        shares_count: 0
                    };
                    this.posts.update(prev => [enrichedPost, ...prev]);
                    this.socketService.emit('newPost', enrichedPost);
                    this.uploadProgress.set(100);
                    finishPosting(true);
                };

                const saveMediaAndFinish = (mediaToSave: any[]) => {
                    if (linkPreview) {
                        mediaToSave.push({
                            media_type: 'link',
                            media_url: linkPreview.url,
                            thumbnail_url: linkPreview.image,
                            file_name: linkPreview.title,
                            link_description: linkPreview.description,
                            link_site_name: linkPreview.siteName
                        });
                    }

                    if (mediaToSave.length > 0) {
                        this.feedsService.createNewMediaPost(newPost.id, mediaToSave).subscribe({
                            next: (res) => finalizePost(res.metadata.newMediaPost),
                            error: (err) => {
                                console.error('Media error:', err);
                                rollbackCreatedPost();
                                finishPosting(false);
                            }
                        });
                    } else {
                        finalizePost();
                    }
                };

                if (hasFiles) {
                    const formData = new FormData();
                    for (const file of this.selectedMediaFiles) formData.append('files', file);
                    for (const file of this.selectedAttachmentFiles) formData.append('files', file);

                    this.uploadStage.set('uploading');
                    this.uploadService.uploadFileFeedsWithProgress(newPost.id, formData).subscribe({
                        next: (event) => {
                            if (event.type === HttpEventType.UploadProgress) {
                                const progress = Math.round(((event.loaded || 0) / (event.total || 1)) * 100);
                                this.uploadProgress.set(Math.min(progress, 97));
                            } else if (event.type === HttpEventType.Response) {
                                this.uploadProgress.set(98);
                                this.uploadStage.set('saving');
                                saveMediaAndFinish([...event.body.metadata.files]);
                            }
                        },
                        error: (err) => {
                            console.error('Upload error:', err);
                            rollbackCreatedPost();
                            finishPosting(false);
                        }
                    });
                } else {
                    saveMediaAndFinish([]);
                }
            },
            error: (err) => {
                console.error('Post error:', err);
                this.error.set('Tạo bài viết thất bại. Vui lòng thử lại.');
                finishPosting(false);
            }
        });
    }

    handleSharePost(post: any) {
        if (post) {
            this.sharingPost.set(post);
            this.shareContent.set('');
            this.sharePrivacy.set('public');
            this.shareLocation.set('');
            this.shareFeeling.set('');
            this.shareLinkPreview = null;
            this.isShareModalOpen.set(true);
        }
    }

    closeShareModal() {
        this.isShareModalOpen.set(false);
        this.sharingPost.set(null);
        this.shareContent.set('');
    }

    confirmSharePost() {
        const postToShare = this.sharingPost();
        if (!postToShare) return;

        // If the post being shared is itself a share, point to the original root post
        const sharedPostId = postToShare.shared_post_id || postToShare.id;

        const shareData = {
            user_id: this._userInfor?.id,
            content: this.shareContent() || null,
            post_type: 'share',
            privacy: this.sharePrivacy(),
            location: this.shareLocation() || null,
            feeling: this.shareFeeling() || null,
            shared_post_id: sharedPostId
        };

        this.feedsService.createNewPost(shareData).subscribe({
            next: (response: any) => {
                const newPostId = response.metadata.newPost.id;

                const completeShare = (mediaData: any[] = []) => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã chia sẻ',
                        text: 'Bài viết đã được chia sẻ lên bảng tin của bạn.',
                        timer: 1500,
                        showConfirmButton: false,
                        background: '#06131f',
                        color: '#fff'
                    });

                    const originalPost = this.sharingPost();
                    if (!originalPost) return;

                    const targetPostId = originalPost.shared_post_id || originalPost.id;

                    this.posts.update(prev => prev.map(post => {
                        if (post.id === originalPost.id || post.id === targetPostId) {
                            return {
                                ...post,
                                shares_count: (post.shares_count || 0) + 1
                            };
                        }
                        return post;
                    }));

                    this.feedsService.updatePost(targetPostId, {
                        postData: { shares_count: (targetPostId === originalPost.id ? originalPost.shares_count : (originalPost.shared_post?.shares_count || 0)) + 1 },
                        mediaData: null
                    }).subscribe();

                    originalPost.shares_count = (originalPost.shares_count || 0) + 1;
                    this.closeShareModal();

                    const sharedPostWithDetails = {
                        ...response.metadata.newPost,
                        user_infor: this._userInfor,
                        comments: [],
                        post_media: mediaData,
                        comments_count: 0,
                        likes_count: 0,
                        shares_count: 0,
                        shared_post: originalPost.shared_post || originalPost
                    };
                    this.posts.update(prev => [sharedPostWithDetails, ...prev]);
                    this.socketService.emit('newPost', sharedPostWithDetails);
                    this.shareLinkPreview = null;
                };

                if (this.shareLinkPreview) {
                    const linkMedia = [{
                        media_type: 'link',
                        media_url: this.shareLinkPreview.url,
                        thumbnail_url: this.shareLinkPreview.image,
                        file_name: this.shareLinkPreview.title,
                        link_description: this.shareLinkPreview.description,
                        link_site_name: this.shareLinkPreview.siteName
                    }];
                    this.feedsService.createNewMediaPost(newPostId, linkMedia).subscribe({
                        next: (mediaResponse) => completeShare(mediaResponse.metadata.newMediaPost),
                        error: () => completeShare([])
                    });
                } else {
                    completeShare([]);
                }
            },
            error: (err: any) => {
                console.error('Error sharing post:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: 'Không thể chia sẻ bài viết. Vui lòng thử lại sau.',
                    background: '#06131f',
                    color: '#fff'
                });
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
                        post.comments_count++;
                        return { ...post, comments: [...(post.comments || []), data.metadata.newComment] };
                    }
                    return post;
                }));

                this.socketService.emit('newComment', data.metadata.newComment);

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


    handleReaction(reaction: any, post: any) {
        const userId = this._userInfor?.id;
        if (!userId) return;

        const currentPosts = this.posts();
        const targetPost = currentPosts.find(p => p.id === post.id);
        if (!targetPost) return;

        const userReaction = targetPost.reactions?.find((r: any) => r.user_id === userId);
        const isSwitching = userReaction && userReaction.reaction_type !== reaction.id;

        if (userReaction) {
            // Case: Already reacted
            // 1. Remove UI first (Optimistic)
            this.posts.update(prev => prev.map(p => {
                if (p.id !== post.id) return p;
                return {
                    ...p,
                    reactions: p.reactions.filter((r: any) => r.user_id !== userId),
                    likes_count: Math.max(0, (p.likes_count || 0) - 1)
                };
            }));

            // Emit socket before DB removal if we want real-time removal for others too
            this.socketService.emit('PostReact', {
                type: 'remove',
                postId: post.id,
                userId: userId,
                reactionId: userReaction.id
            });

            // 2. Remove from DB
            this.feedReaction.removePostReaction(userReaction.id).subscribe({
                next: () => {
                    console.log('Reaction removed successfully from DB');
                    // 3. If switching to a new reaction, add it after removal
                    if (isSwitching) {
                        this.addReactionOptimistically(post.id, userId, reaction);
                    }
                },
                error: (err: any) => {
                    console.error('Error removing reaction:', err);
                }
            });
        } else {
            // Case: Not reacted yet
            this.addReactionOptimistically(post.id, userId, reaction);
        }
    }

    private addReactionOptimistically(postId: string, userId: string, reaction: any) {
        const tempID = `temp-${Math.random().toString(36).substring(2, 15)}`;
        const reactData = {
            id: tempID,
            post_id: postId,
            user_id: userId,
            emoji_char: reaction.icon,
            reaction_type: reaction.id,
            created_at: new Date().toISOString(),
            user_infor: this._userInfor
        };

        // 1. Update UI (Optimistic add)
        this.posts.update(prev => prev.map(p => {
            if (p.id !== postId) return p;
            return {
                ...p,
                reactions: [...(p.reactions || []), reactData],
                likes_count: (p.likes_count || 0) + 1
            };
        }));

        // 2. Add to DB
        this.feedReaction.addPostReaction(postId, userId, reaction.id, reaction.icon).subscribe({
            next: (data: any) => {
                const realReaction = data.metadata.newReaction;
                console.log('Reaction added successfully:', realReaction);

                // Emit socket with real data
                this.socketService.emit('PostReact', {
                    type: 'add',
                    postId: postId,
                    userId: userId,
                    reaction: { ...realReaction, user_infor: this._userInfor }
                });

                // 3. Update temp ID with real ID from server
                this.posts.update(prev => prev.map(p => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        reactions: p.reactions.map((r: any) =>
                            r.id === tempID ? { ...r, id: realReaction.id } : r
                        )
                    };
                }));
            },
            error: (err: any) => {
                console.error('Error adding reaction:', err);
                // Rollback UI update
                this.posts.update(prev => prev.map(p => {
                    if (p.id !== postId) return p;
                    return {
                        ...p,
                        reactions: p.reactions.filter((r: any) => r.id !== tempID),
                        likes_count: Math.max(0, (p.likes_count || 0) - 1)
                    };
                }));
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

    getMediaItems(post: any): any[] {
        if (!post.post_media || !Array.isArray(post.post_media)) return [];
        return post.post_media.filter((media: any) =>
            media.media_type === 'image' || media.media_type === 'video'
        );
    }

    getAttachmentItems(post: any): any[] {
        if (!post.post_media || !Array.isArray(post.post_media)) return [];
        return post.post_media.filter((media: any) => media.media_type === 'file');
    }

    getUniqueReactionEmojis(post: any): string[] {
        if (!post.reactions || !post.reactions.length) return [];
        const uniqueEmojis = new Set<string>();
        post.reactions.forEach((r: any) => {
            if (r.emoji_char) {
                uniqueEmojis.add(r.emoji_char);
            } else {
                const found = this.reactions.find(react => react.id === r.reaction_type);
                if (found) {
                    uniqueEmojis.add(found.icon);
                } else if (r.reaction_type === 'like') {
                    uniqueEmojis.add('👍');
                }
            }
        });
        return Array.from(uniqueEmojis).slice(0, 3);
    }

    getTotalReactions(post: any): number {
        return post.reactions ? post.reactions.length : 0;
    }

    isReactionModalOpen = signal(false);
    modalReactions = signal<any[]>([]);

    openReactionModal(post: any) {
        if (!post.reactions || post.reactions.length === 0) return;
        this.modalReactions.set(post.reactions);
        this.isReactionModalOpen.set(true);
        document.body.style.overflow = 'hidden';
    }

    closeReactionModal() {
        this.isReactionModalOpen.set(false);
        this.modalReactions.set([]);
        document.body.style.overflow = 'auto';
    }

    getReactionIcon(type: string): string {
        return this.reactions.find(r => r.id === type)?.icon || '👍';
    }

    getReactionLottieUrl(type: string): string {
        return this.reactions.find(r => r.id === type)?.lottieUrl || 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/lottie.json';
    }
}

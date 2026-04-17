import { Injectable, signal, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { Feeds } from './feeds';
import { SocketService } from './socket';
import { FeedReactions } from './feed_reactions';
import { Comment } from './comment';
import { Emojis } from './emojis';

@Injectable({
    providedIn: 'root'
})
export class FeedStoreService {
    private feedsService = inject(Feeds);
    private socketService = inject(SocketService);
    private reactionService = inject(FeedReactions);
    private commentService = inject(Comment);
    private emojiService = inject(Emojis);

    // --- State ---
    posts = signal<any[]>([]);
    emojis = signal<any[]>([]);
    loading = signal(false);
    loadingMore = signal(false);
    hasMore = signal(true);
    offset = signal(0);
    limit = 10;
    error = signal<string | null>(null);

    // --- Socket Callbacks ---
    private onNewPostSocket?: (data: any) => void;
    private onUpdatePostSocket?: (data: any) => void;
    private onDeletePostSocket?: (data: any) => void;
    private onNewCommentSocket?: (data: any) => void;
    private onPostReactSocket?: (data: any) => void;

    constructor() {
        this.setupSocketListeners();
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

        const feeds$ = this.feedsService.getFeeds(this.limit, this.offset());
        const emojis$ = isLoadMore ? of(null) : this.emojiService.getEmojis();

        forkJoin({
            feeds: feeds$,
            emojis: emojis$
        }).subscribe({
            next: (res: any) => {
                const homePosts = res.feeds.metadata.homePosts || [];
                
                // Update Emojis if initial load
                if (!isLoadMore && res.emojis) {
                    this.emojis.set(res.emojis.metadata || []);
                }

                if (isLoadMore) {
                    this.posts.update((prev: any[]) => [...prev, ...homePosts]);
                    this.loadingMore.set(false);
                } else {
                    this.posts.set(homePosts);
                    this.loading.set(false);
                }

                this.offset.update((old: number) => old + homePosts.length);
                if (homePosts.length < this.limit) {
                    this.hasMore.set(false);
                }
            },
            error: (err: any) => {
                console.error('Error loading feeds/emojis:', err);
                this.error.set('Không thể tải bài viết. Vui lòng thử lại sau.');
                this.loading.set(false);
                this.loadingMore.set(false);
            }
        });
    }

    private setupSocketListeners() {
        this.onNewPostSocket = (data: any) => {
            if (data.shared_post) {
                this.posts.update((posts: any[]) => posts.map((post: any) => {
                    if (post.id === data.shared_post.id) {
                        return { ...post, shares_count: data.shared_post.shares_count };
                    }
                    return post;
                }));
            }
            this.posts.update((posts: any[]) => {
                if (posts.some((p: any) => p.id === data.id)) return posts;
                return [data, ...posts];
            });
        };
        this.socketService.on('newPost', this.onNewPostSocket);

        this.onUpdatePostSocket = (data: any) => {
            this.posts.update((posts: any[]) => posts.map((post: any) => {
                if (post.id === data.id) return data;
                if (post.shared_post && post.shared_post.id === data.id) {
                    return { ...post, shared_post: data };
                }
                return post;
            }));
        };
        this.socketService.on('updatePost', this.onUpdatePostSocket);

        this.onDeletePostSocket = (data: any) => {
            this.posts.update((posts: any[]) => posts.filter((post: any) => post.id !== data.id).map((post: any) => {
                if (post.shared_post && post.shared_post.id === data.id) {
                    return {
                        ...post,
                        shared_post: { ...post.shared_post, is_deleted: true }
                    };
                }
                return post;
            }));
        };
        this.socketService.on('deletePost', this.onDeletePostSocket);

        this.onNewCommentSocket = (data: any) => {
            this.posts.update((posts: any[]) => posts.map((post: any) => {
                if (post.id === data.post_id) {
                    return { 
                        ...post, 
                        comments_count: (post.comments_count || 0) + 1,
                        comments: [...(post.comments || []), data] 
                    };
                }
                return post;
            }));
        };
        this.socketService.on('newComment', this.onNewCommentSocket);

        this.onPostReactSocket = (data: any) => {
            const { type, postId, userId, reaction, reactionId } = data;
            this.posts.update((prev: any[]) => prev.map((p: any) => {
                if (p.id !== postId) return p;
                if (type === 'add') {
                    if (p.reactions?.some((r: any) => r.id === reaction.id)) return p;
                    return {
                        ...p,
                        reactions: [...(p.reactions || []), reaction],
                        likes_count: (p.likes_count || 0) + 1
                    };
                } else if (type === 'remove') {
                    return {
                        ...p,
                        reactions: (p.reactions || []).filter((r: any) => r.id !== reactionId && r.user_id !== userId),
                        likes_count: Math.max(0, (p.likes_count || 0) - 1)
                    };
                }
                return p;
            }));
        };
        this.socketService.on('PostReact', this.onPostReactSocket);
    }

    // --- Actions ---
    createPost(postData: any) {
        return this.feedsService.createNewPost(postData);
    }

    updatePost(postId: string, postData: any) {
        return this.feedsService.updatePost(postId, postData);
    }

    deletePost(postId: string) {
        return this.feedsService.deletePost(postId);
    }

    reactToPost(postId: string, reactionData: any) {
        return this.reactionService.addPostReaction(
            reactionData.post_id || postId,
            reactionData.user_id,
            reactionData.reaction_type,
            reactionData.emoji_char
        );
    }

    commentOnPost(commentData: any) {
        return this.commentService.createComment(commentData.post_id, commentData);
    }

    emitSocket(event: string, data: any) {
        this.socketService.emit(event, data);
    }

    updatePostAuthorInfo(userData: any) {
        this.posts.update((posts: any[]) => posts.map((post: any) => {
            let hasChanges = false;
            let updatedPost = { ...post };

            if (post.user_id === userData.id) {
                updatedPost.user_infor = { ...post.user_infor, ...userData };
                hasChanges = true;
            }

            if (Array.isArray(post.comments)) {
                updatedPost.comments = post.comments.map((c: any) =>
                    c.user_id === userData.id
                        ? { ...c, user_infor: { ...c.user_infor, ...userData } }
                        : c
                );
                if (updatedPost.comments !== post.comments) hasChanges = true;
            }

            return hasChanges ? updatedPost : post;
        }));
    }
}

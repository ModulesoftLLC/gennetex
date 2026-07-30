import { supabase } from '../lib/supabase';
import * as notifyApi from './notificationService';
import {
  firebaseCreate,
  firebaseDelete,
  firebaseGetOne,
  firebaseList,
  firebaseSet,
  firebaseSubscribe,
  firebaseUpdate,
  firebaseUploadUri,
} from '../lib/firebaseAdapter';

const REACTIONS = ['like', 'love', 'care', 'haha', 'angry'];

export function isValidReaction(r) {
  return REACTIONS.includes(r);
}

async function uploadFeedMedia(uri, { folder = 'posts', mimeType = 'image/jpeg', fileName } = {}) {
  const extension = (fileName?.match(/\.([a-z0-9]+)$/i)?.[1]) || (mimeType.startsWith('video/') ? 'mp4' : 'jpg');
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  return firebaseUploadUri(path, uri, mimeType);
}

async function fetchAllUserIds(excludeId) {
  const data = await firebaseList('profiles');
  return (data || []).map((p) => p.id).filter((id) => id && id !== excludeId);
}

function attachMeta(posts, reactions, comments, profilesById = {}) {
  const byPostReact = {};
  const byPostComment = {};
  (reactions || []).forEach((r) => {
    if (!byPostReact[r.post_id]) byPostReact[r.post_id] = [];
    byPostReact[r.post_id].push(r);
  });
  (comments || []).forEach((c) => {
    if (!byPostComment[c.post_id]) byPostComment[c.post_id] = [];
    byPostComment[c.post_id].push(c);
  });
  return (posts || []).map((p) => {
    const reacts = byPostReact[p.id] || [];
    const counts = { like: 0, love: 0, care: 0, haha: 0, angry: 0 };
    reacts.forEach((r) => {
      if (counts[r.reaction] != null) counts[r.reaction] += 1;
    });
    const author = profilesById[p.author_id] || {};
    const postComments = (byPostComment[p.id] || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((c) => ({
        ...c,
        user_avatar_url: profilesById[c.user_id]?.avatar_url || null,
        user_name: c.user_name || profilesById[c.user_id]?.name || 'Ажилтан',
      }));
    return {
      ...p,
      author_name: p.author_name || author.name || 'Ажилтан',
      author_avatar_url: author.avatar_url || null,
      tags: Array.isArray(p.tags) ? p.tags : [],
      reactions: reacts,
      reactionCounts: counts,
      reactionTotal: reacts.length,
      comments: postComments,
      commentCount: postComments.length,
    };
  });
}

async function fetchProfilesMap(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const allProfiles = await firebaseList('profiles');
  const map = {};
  (allProfiles || []).filter((p) => ids.includes(p.id)).forEach((p) => {
    map[p.id] = { id: p.id, name: p.name, avatar_url: p.avatar_url };
  });
  return map;
}

async function hydratePosts(posts) {
  if (!posts?.length) return [];
  const ids = posts.map((p) => p.id);
  const [reactions, comments] = await Promise.all([
    firebaseList('post_reactions', { whereClauses: [{ field: 'post_id', op: 'in', value: ids }] }),
    firebaseList('post_comments', { whereClauses: [{ field: 'post_id', op: 'in', value: ids }] }),
  ]);
  const profileIds = [
    ...posts.map((p) => p.author_id),
    ...(comments || []).map((c) => c.user_id),
  ];
  const profilesById = await fetchProfilesMap(profileIds);
  return attachMeta(posts, reactions, comments, profilesById);
}

export async function fetchFeed(limit = 50) {
  const posts = await firebaseList('posts', {
    order: { field: 'created_at', direction: 'desc' },
    limitCount: limit,
  });
  return hydratePosts(posts);
}

export async function fetchPostsByAuthor(authorId, limit = 50) {
  if (!authorId) return [];
  const posts = await firebaseList('posts', {
    whereClauses: [{ field: 'author_id', op: '==', value: authorId }],
    order: { field: 'created_at', direction: 'desc' },
    limitCount: limit,
  });
  return hydratePosts(posts);
}

export async function fetchPostById(postId) {
  if (!postId) return null;
  const post = await firebaseGetOne('posts', postId);
  if (!post) return null;
  const [hydrated] = await hydratePosts([post]);
  return hydrated;
}

export async function searchPosts(query, limit = 40) {
  const q = String(query || '').trim();
  if (!q) return [];
  const posts = await firebaseList('posts', {
    order: { field: 'created_at', direction: 'desc' },
    limitCount: limit,
  });
  const filtered = (posts || []).filter((post) => {
    const text = `${post.content || ''} ${post.author_name || ''}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });
  return hydratePosts(filtered);
}

export async function fetchFeedProfile(userId) {
  if (!userId) return null;
  return firebaseGetOne('profiles', userId);
}

export async function createPost({ authorId, authorName, content, imageUri, videoUri, mediaMimeType, mediaFileName, tags = [] }) {
  const body = String(content || '').trim();
  if (!body && !imageUri && !videoUri) throw new Error('Пост хоосон байна');

  let imageUrl = null;
  let videoUrl = null;
  if (imageUri) imageUrl = await uploadFeedMedia(imageUri, { mimeType: mediaMimeType || 'image/jpeg', fileName: mediaFileName });
  if (videoUri) videoUrl = await uploadFeedMedia(videoUri, { mimeType: mediaMimeType || 'video/mp4', fileName: mediaFileName });

  const cleanTags = (tags || [])
    .filter((t) => t?.user_id && t?.user_name)
    .map((t) => ({ user_id: t.user_id, user_name: t.user_name }));

  const data = await firebaseCreate('posts', {
    author_id: authorId,
    author_name: authorName,
    content: body,
    image_url: imageUrl,
    video_url: videoUrl,
    tags: cleanTags,
    created_at: new Date().toISOString(),
  });

  try {
    const recipients = await fetchAllUserIds(authorId);
    await notifyApi.notifyUsers(recipients, {
      title: `${authorName || 'Ажилтан'} шинэ пост тавилаа`,
      body: body || (videoUrl ? 'Видеотой пост' : 'Зурагтай пост'),
      data: { type: 'feed', postId: data.id },
      channelId: 'feed',
      priority: 'high',
    });
    const taggedIds = cleanTags.map((t) => t.user_id).filter((id) => id !== authorId);
    if (taggedIds.length) {
      await notifyApi.notifyUsers(taggedIds, {
        title: `${authorName || 'Ажилтан'} таныг tag хийлээ`,
        body: body || 'Пост дээр tag хийгдлээ',
        data: { type: 'feed', postId: data.id },
        channelId: 'feed',
        priority: 'high',
      });
    }
  } catch (e) {}

  const profiles = await fetchProfilesMap([authorId]);
  const author = profiles[authorId] || {};

  return {
    ...data,
    author_name: data.author_name || author.name || authorName,
    author_avatar_url: author.avatar_url || null,
    tags: cleanTags,
    reactions: [],
    reactionCounts: { like: 0, love: 0, care: 0, haha: 0, angry: 0 },
    reactionTotal: 0,
    comments: [],
    commentCount: 0,
  };
}

export async function deletePost(postId, userId) {
  const post = await firebaseGetOne('posts', postId);
  if (!post || post.author_id !== userId) return;
  await firebaseDelete('posts', postId);
}

/** Постыг feed дээр хуваалцах (share) */
export async function sharePost({ post, authorId, authorName }) {
  if (!post?.id || !authorId) throw new Error('Пост олдсонгүй');
  const originalAuthor = post.author_name || 'Ажилтан';
  const header = `🔄 ${originalAuthor}-ийн постыг хуваалцлаа`;
  const body = post.content ? `${header}\n\n${post.content}` : header;

  const data = await firebaseCreate('posts', {
    author_id: authorId,
    author_name: authorName,
    content: body,
    image_url: post.image_url || null,
    video_url: post.video_url || null,
    tags: [],
    created_at: new Date().toISOString(),
  });

  try {
    const recipients = await fetchAllUserIds(authorId);
    await notifyApi.notifyUsers(recipients, {
      title: `${authorName || 'Ажилтан'} пост хуваалцлаа`,
      body: post.content || `${originalAuthor}-ийн пост`,
      data: { type: 'feed', postId: data.id },
      channelId: 'feed',
      priority: 'default',
    });
  } catch (e) {}

  const profiles = await fetchProfilesMap([authorId]);
  const author = profiles[authorId] || {};
  return {
    ...data,
    author_name: data.author_name || author.name || authorName,
    author_avatar_url: author.avatar_url || null,
    tags: [],
    reactions: [],
    reactionCounts: { like: 0, love: 0, care: 0, haha: 0, angry: 0 },
    reactionTotal: 0,
    comments: [],
    commentCount: 0,
  };
}

export async function setReaction({ postId, userId, userName, reaction, postAuthorId, postAuthorName }) {
  if (!isValidReaction(reaction)) throw new Error('Буруу reaction');

  const existing = await firebaseList('post_reactions', {
    whereClauses: [
      { field: 'post_id', op: '==', value: postId },
      { field: 'user_id', op: '==', value: userId },
    ],
  });
  const current = (existing || [])[0];

  if (current?.reaction === reaction) {
    await firebaseDelete('post_reactions', current.id);
    return null;
  }

  if (current) {
    const data = await firebaseUpdate('post_reactions', current.id, { reaction, user_name: userName });
    return data;
  }

  const data = await firebaseCreate('post_reactions', {
    post_id: postId,
    user_id: userId,
    user_name: userName,
    reaction,
    created_at: new Date().toISOString(),
  });

  if (postAuthorId && postAuthorId !== userId) {
    try {
      await notifyApi.notifyUsers([postAuthorId], {
        title: `${userName || 'Ажилтан'} таны постад reaction дарлаа`,
        body: reactionLabel(reaction),
        data: { type: 'feed', postId },
        channelId: 'feed',
        priority: 'default',
      });
    } catch (e) {}
  }

  return data;
}

export async function addComment({ postId, userId, userName, content, postAuthorId }) {
  const body = String(content || '').trim();
  if (!body) throw new Error('Сэтгэгдэл хоосон байна');

  const data = await firebaseCreate('post_comments', {
    post_id: postId,
    user_id: userId,
    user_name: userName,
    content: body,
    created_at: new Date().toISOString(),
  });

  if (postAuthorId && postAuthorId !== userId) {
    try {
      await notifyApi.notifyUsers([postAuthorId], {
        title: `${userName || 'Ажилтан'} сэтгэгдэл бичлээ`,
        body,
        data: { type: 'feed', postId },
        channelId: 'feed',
        priority: 'high',
      });
    } catch (e) {}
  }

  return data;
}

export async function deleteComment(commentId, userId) {
  const comment = await firebaseGetOne('post_comments', commentId);
  if (!comment || comment.user_id !== userId) return;
  await firebaseDelete('post_comments', commentId);
}

export function reactionLabel(reaction) {
  const map = {
    like: '👍 Like',
    love: '❤️ Love',
    care: '🤗 Care',
    haha: '😆 Haha',
    angry: '😠 Angry',
  };
  return map[reaction] || reaction;
}

export function reactionEmoji(reaction) {
  const map = {
    like: '👍',
    love: '❤️',
    care: '🤗',
    haha: '😆',
    angry: '😠',
  };
  return map[reaction] || '👍';
}

/** Story-уудыг author-оор бүлэглэж, 24 цагийн доторхыг буцаана */
export async function fetchStories(viewerId) {
  const now = new Date().toISOString();
  const stories = await firebaseList('stories', {
    order: { field: 'created_at', direction: 'desc' },
  });
  const activeStories = (stories || []).filter((story) => (story.expires_at || '').toString() > now);
  if (!activeStories.length) return [];

  const ids = activeStories.map((s) => s.id);
  const views = await firebaseList('story_views', {
    whereClauses: [{ field: 'user_id', op: '==', value: viewerId }],
  });
  const seen = new Set((views || []).filter((v) => ids.includes(v.story_id)).map((v) => v.story_id));
  const profilesById = await fetchProfilesMap(activeStories.map((s) => s.author_id));

  const byAuthor = new Map();
  activeStories.forEach((s) => {
    if (!byAuthor.has(s.author_id)) {
      const profile = profilesById[s.author_id] || {};
      byAuthor.set(s.author_id, {
        author_id: s.author_id,
        author_name: s.author_name || profile.name,
        author_avatar_url: profile.avatar_url || null,
        stories: [],
        hasUnseen: false,
        latestAt: s.created_at,
        coverUrl: s.image_url,
      });
    }
    const group = byAuthor.get(s.author_id);
    group.stories.push({ ...s, seen: seen.has(s.id) });
    if (!seen.has(s.id) && s.author_id !== viewerId) group.hasUnseen = true;
  });

  // тус бүрийн story-г хуучин → шинэ дарааллаар (viewer-д зүүнээс баруун)
  const groups = [...byAuthor.values()].map((g) => ({
    ...g,
    stories: g.stories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    coverUrl: g.stories[g.stories.length - 1]?.image_url || g.coverUrl,
  }));

  // миний story эхэнд, дараа нь unseen, дараа нь бусад
  groups.sort((a, b) => {
    if (a.author_id === viewerId) return -1;
    if (b.author_id === viewerId) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return new Date(b.latestAt) - new Date(a.latestAt);
  });

  return groups;
}

export async function createStory({ authorId, authorName, imageUri }) {
  if (!imageUri) throw new Error('Story зураг сонгоно уу');
  const imageUrl = await uploadFeedMedia(imageUri, { folder: 'stories' });
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const data = await firebaseCreate('stories', {
    author_id: authorId,
    author_name: authorName,
    image_url: imageUrl,
    expires_at: expires,
    created_at: new Date().toISOString(),
  });

  try {
    const recipients = await fetchAllUserIds(authorId);
    await notifyApi.notifyUsers(recipients, {
      title: `${authorName || 'Ажилтан'} story нэмлээ`,
      body: 'Story үзэх',
      data: { type: 'feed', storyId: data.id },
      channelId: 'feed',
      priority: 'high',
    });
  } catch (e) {}

  return data;
}

export async function markStoryViewed(storyId, userId) {
  if (!storyId || !userId) return;
  await firebaseSet('story_views', `${storyId}_${userId}`, { story_id: storyId, user_id: userId });
}

export function subscribeFeed({ onPost, onReaction, onComment, onStory }) {
  const unsubPosts = firebaseSubscribe('posts', (items) => {
    onPost?.(items?.[0] || null);
  });
  const unsubReactions = firebaseSubscribe('post_reactions', (items) => {
    onReaction?.(items);
  });
  const unsubComments = firebaseSubscribe('post_comments', (items) => {
    onComment?.(items?.[0] || null);
  });
  const unsubStories = firebaseSubscribe('stories', (items) => {
    onStory?.(items?.[0] || null);
  });

  return () => {
    unsubPosts?.();
    unsubReactions?.();
    unsubComments?.();
    unsubStories?.();
  };
}

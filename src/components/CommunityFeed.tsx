"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  MessageSquare, Heart, Share2, Plus, Users, Lock, Code2,
  PlayCircle, Send, Radio, Search, Sparkles, BookOpen, Clock,
  Check, ExternalLink, Flame, Bookmark
} from "lucide-react";

interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content_text: string;
  media_url?: string;
  media_type?: string;
  category?: string;
  room_code?: string;
  room_type?: "study" | "coding";
  created_at: string;
  likes: { id?: string; user_id: string }[];
  comments: CommunityComment[];
}

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "seed-post-1",
    author_id: "user-sarah",
    author_name: "Sarah Chen",
    author_avatar: "",
    content_text: "Hey everyone! Starting a 50-minute deep focus study block with the Rainy Cafe scene. Whiteboard is set up for reviewing Distributed Systems papers. Join in if you're working on systems or algorithms!",
    category: "study",
    room_code: "FOCUS1",
    room_type: "study",
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    likes: [{ user_id: "u-1" }, { user_id: "u-2" }, { user_id: "u-3" }, { user_id: "u-4" }],
    comments: [
      {
        id: "c-1",
        post_id: "seed-post-1",
        author_id: "u-1",
        author_name: "Alex Rivera",
        content: "Love the Rainy Cafe ambient sound. Hopping in now!",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "seed-post-2",
    author_id: "user-devin",
    author_name: "Devin Vance",
    author_avatar: "",
    content_text: "Built a tiny WebAssembly AST interpreter in Rust today. Testing browser-side bytecode execution with Monaco. What syntax constructs do you usually recommend keeping minimal for v1?",
    category: "showcase",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    likes: [{ user_id: "u-3" }, { user_id: "u-5" }, { user_id: "u-6" }],
    comments: [
      {
        id: "c-2",
        post_id: "seed-post-2",
        author_id: "u-7",
        author_name: "Elena Rostova",
        content: "Stick to S-expressions or a straightforward Pratt parser first. Makes AST generation super clean.",
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "seed-post-3",
    author_id: "user-marcus",
    author_name: "Marcus Aurel",
    author_avatar: "",
    content_text: "Night Library session is live! We have 3 spots open for a collaborative Pomodoro sprint (25m focus / 5m break). Cam/Mic optional, screen share open.",
    category: "study",
    room_code: "NIGHT9",
    room_type: "study",
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    likes: [{ user_id: "u-2" }, { user_id: "u-8" }],
    comments: [],
  },
];

const COMMUNITY_STORAGE_KEY = "codetogether_community_posts_v2";

export default function CommunityFeed({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"feed" | "live" | "members">("feed");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<string>("general");
  const [attachedRoomCode, setAttachedRoomCode] = useState("");
  const [attachedRoomType, setAttachedRoomType] = useState<"study" | "coding">("study");
  const [isPosting, setIsPosting] = useState(false);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [copiedLinkPostId, setCopiedLinkPostId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string }>({
    name: "You",
  });

  // Current user display name
  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (session?.user) {
        setUserProfile({
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Developer",
          avatar: session.user.user_metadata?.avatar_url,
        });
      }
    });
  }, []);

  // Load posts with Supabase and local resilience
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let loadedFromDb = false;

    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        // Fetch comments and likes if available
        const postIds = data.map((p: any) => p.id);
        const [{ data: commentsData }, { data: likesData }] = await Promise.all([
          supabase.from("comments").select("*").in("post_id", postIds),
          supabase.from("likes").select("*").in("post_id", postIds),
        ]);

        const mapped: CommunityPost[] = data.map((p: any) => ({
          id: p.id,
          author_id: p.author_id,
          author_name: p.author_name || "Community Member",
          author_avatar: p.author_avatar,
          content_text: p.content_text,
          media_url: p.media_url,
          media_type: p.media_type,
          category: p.category || "general",
          created_at: p.created_at,
          likes: (likesData || []).filter((l: any) => l.post_id === p.id),
          comments: (commentsData || []).filter((c: any) => c.post_id === p.id),
        }));

        setPosts(mapped);
        loadedFromDb = true;
      }
    } catch (_) {}

    // Fallback to localStorage or curated seed posts
    if (!loadedFromDb) {
      try {
        const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPosts(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}
      setPosts(INITIAL_COMMUNITY_POSTS);
    }
    setLoading(false);
  }, []);

  // Save posts to localStorage
  const persistPosts = (updated: CommunityPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  // Fetch active rooms without brittle foreign key joins
  const fetchLiveRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, room_code, created_by, is_active, language, created_at, room_type")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        const parsed = data.map((r: any) => {
          let meta: any = {};
          if (r.name && r.name.startsWith("{")) {
            try {
              meta = JSON.parse(r.name);
            } catch {
              meta = { title: r.name };
            }
          } else {
            meta = { title: r.name || "Live Session" };
          }
          const isStudy = meta.roomType === "study" || r.room_type === "study";
          return {
            ...r,
            meta,
            isStudy,
            title: meta.title || r.name || (isStudy ? "Study Room" : "Coding Workspace"),
            hostName: meta.authorName || "Host",
          };
        }).filter((r: any) => !r.meta?.isLibrary);

        setLiveRooms(parsed);
      }
    } catch (err) {
      console.error("fetchLiveRooms error:", err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchLiveRooms();
  }, [fetchPosts, fetchLiveRooms]);

  // Create post handler
  const handleCreatePost = async () => {
    const text = newPostContent.trim();
    if (!text) return;
    setIsPosting(true);

    const safeAuthorId = currentUserId || "guest_" + Math.random().toString(36).substring(2, 7);
    const newPost: CommunityPost = {
      id: "post_" + Date.now(),
      author_id: safeAuthorId,
      author_name: userProfile.name,
      author_avatar: userProfile.avatar,
      content_text: text,
      category: newPostCategory,
      room_code: attachedRoomCode.trim() || undefined,
      room_type: attachedRoomCode.trim() ? attachedRoomType : undefined,
      created_at: new Date().toISOString(),
      likes: [],
      comments: [],
    };

    // Optimistic local update
    const nextPosts = [newPost, ...posts];
    persistPosts(nextPosts);
    setNewPostContent("");
    setAttachedRoomCode("");

    // Attempt Supabase insert
    try {
      await supabase.from("posts").insert({
        id: newPost.id,
        author_id: newPost.author_id,
        author_name: newPost.author_name,
        author_avatar: newPost.author_avatar,
        content_text: newPost.content_text,
        category: newPost.category,
      });
    } catch (_) {}

    setIsPosting(false);
  };

  // Toggle Like
  const handleToggleLike = async (postId: string) => {
    const safeUserId = currentUserId || "guest_viewer";
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes.some((l) => l.user_id === safeUserId);
    const updatedLikes = hasLiked
      ? post.likes.filter((l) => l.user_id !== safeUserId)
      : [...post.likes, { user_id: safeUserId }];

    const updatedPosts = posts.map((p) => (p.id === postId ? { ...p, likes: updatedLikes } : p));
    persistPosts(updatedPosts);

    try {
      if (hasLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", safeUserId);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: safeUserId });
      }
    } catch (_) {}
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    const newComment: CommunityComment = {
      id: "comment_" + Date.now(),
      post_id: postId,
      author_id: currentUserId || "guest_viewer",
      author_name: userProfile.name,
      author_avatar: userProfile.avatar,
      content: text,
      created_at: new Date().toISOString(),
    };

    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        return { ...p, comments: [...p.comments, newComment] };
      }
      return p;
    });

    persistPosts(updatedPosts);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));

    try {
      await supabase.from("comments").insert({
        id: newComment.id,
        post_id: newComment.post_id,
        author_id: newComment.author_id,
        author_name: newComment.author_name,
        content: newComment.content,
      });
    } catch (_) {}
  };

  // Quick Start Room
  const startRoom = async (type: "coding" | "study") => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    const defaultTitle = type === "study" ? "Live Focus Study Room" : "Live Coding Jam";

    try {
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers,
        body: JSON.stringify({
          roomName: defaultTitle,
          language: "typescript",
          roomType: type,
          isPrivate: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        if (type === "study") {
          router.push(`/study/${data.id}`);
        } else {
          router.push(`/room/${data.id}`);
        }
      } else {
        // Fallback room code redirect
        const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(type === "study" ? `/study/${fallbackCode}` : `/room/${fallbackCode}`);
      }
    } catch (_) {
      const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      router.push(type === "study" ? `/study/${fallbackCode}` : `/room/${fallbackCode}`);
    }
  };

  // Copy Post Share Link
  const handleCopyPostLink = (post: CommunityPost) => {
    if (typeof window !== "undefined") {
      const targetUrl = post.room_code
        ? `${window.location.origin}/join/${post.room_code}`
        : `${window.location.origin}/feed`;
      navigator.clipboard.writeText(targetUrl);
      setCopiedLinkPostId(post.id);
      setTimeout(() => setCopiedLinkPostId(null), 2000);
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "study" && (p.category === "study" || p.room_type === "study")) ||
        (selectedCategory === "showcase" && p.category === "showcase") ||
        (selectedCategory === "qna" && p.category === "qna");

      const matchesSearch =
        !searchQuery.trim() ||
        p.content_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.room_code && p.room_code.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto font-['DM_Sans',sans-serif]">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B3340]/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "feed"
                ? "bg-[#3DD6B0] text-[#0E1116] shadow-lg shadow-[#3DD6B0]/20"
                : "bg-[#141920] hover:bg-[#1C232D] text-[#8B97A7] border border-[#2B3340]/50"
            }`}
          >
            <MessageSquare size={15} /> Community Feed
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "live"
                ? "bg-[#82AAFF] text-[#0E1116] shadow-lg shadow-[#82AAFF]/20"
                : "bg-[#141920] hover:bg-[#1C232D] text-[#8B97A7] border border-[#2B3340]/50"
            }`}
          >
            <Radio size={15} /> Live Sessions & Hub
            {liveRooms.length > 0 && (
              <span className="bg-[#FF8A8A] text-[#0E1116] text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {liveRooms.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-[#141920] border border-[#2B3340]/60 rounded-xl px-3 py-1.5 w-full sm:w-auto">
          <Search size={14} className="text-[#8B97A7]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions & rooms..."
            className="bg-transparent border-none outline-none text-xs text-[#E6EDF3] placeholder-[#8B97A7] w-full sm:w-48"
          />
        </div>
      </div>

      {/* FEED TAB */}
      {activeTab === "feed" && (
        <div className="flex flex-col gap-5">
          {/* Create Post Card */}
          <div className="rounded-2xl border border-[#2B3340]/80 bg-[#141920] p-4.5 shadow-xl">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1F5A4D] to-[#3DD6B0] flex items-center justify-center text-[#0E1116] font-black text-sm flex-shrink-0 shadow-md">
                {userProfile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share a project update, study room invite, question, or snippet..."
                  className="w-full bg-transparent border-none resize-none focus:outline-none text-[14px] text-[#E6EDF3] placeholder-[#8B97A7] min-h-[70px]"
                />
              </div>
            </div>

            {/* Optional Room Attachment Input */}
            <div className="mt-2 pt-2 border-t border-[#232A35] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="bg-[#0E1116] border border-[#2B3340] text-xs text-[#E6EDF3] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="general">💬 General Update</option>
                  <option value="study">📚 Study Session / Hub</option>
                  <option value="showcase">💻 Project Showcase</option>
                  <option value="qna">💡 Ask Question</option>
                </select>

                <div className="flex items-center gap-1 bg-[#0E1116] border border-[#2B3340] rounded-lg px-2 py-1 text-xs">
                  <span className="text-[#8B97A7]">Attach Room:</span>
                  <input
                    value={attachedRoomCode}
                    onChange={(e) => setAttachedRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FOCUS1"
                    className="bg-transparent border-none outline-none font-mono text-[#3DD6B0] w-20 text-xs font-bold"
                  />
                  {attachedRoomCode && (
                    <select
                      value={attachedRoomType}
                      onChange={(e) => setAttachedRoomType(e.target.value as any)}
                      className="bg-[#141920] border-none text-[11px] text-[#82AAFF] rounded outline-none"
                    >
                      <option value="study">Study</option>
                      <option value="coding">Coding</option>
                    </select>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={isPosting || !newPostContent.trim()}
                className="px-5 py-2 bg-[#3DD6B0] hover:bg-[#34c4a1] disabled:opacity-40 text-[#0E1116] font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Send size={13} />
                {isPosting ? "Posting..." : "Share to Community"}
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { id: "all", label: "🌟 All Posts" },
              { id: "study", label: "📚 Study Sessions" },
              { id: "showcase", label: "💻 Code Showcases" },
              { id: "qna", label: "💡 Q&A & Advice" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-[#1F5A4D] text-[#3DD6B0] border border-[#3DD6B0]/50"
                    : "bg-[#141920] text-[#8B97A7] hover:text-[#E6EDF3] border border-[#2B3340]/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="py-16 text-center text-[#8B97A7] flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#3DD6B0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading community discussions...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border border-[#2B3340]/60 bg-[#141920] p-8">
              <Code2 size={36} className="mx-auto mb-2 text-[#8B97A7] opacity-50" />
              <p className="font-bold text-[#E6EDF3]">No posts matching this filter</p>
              <p className="text-xs text-[#8B97A7] mt-1">Be the first to share an update or question with the community!</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const safeUserId = currentUserId || "guest_viewer";
              const hasLiked = post.likes.some((l) => l.user_id === safeUserId);
              const isStudyPost = post.category === "study" || post.room_type === "study";

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-[#2B3340]/70 bg-[#141920] p-5 shadow-lg flex flex-col gap-3.5 transition-all hover:border-[#2B3340]"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1C232D] border border-[#2B3340] flex items-center justify-center font-bold text-xs text-[#3DD6B0] overflow-hidden">
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
                        ) : (
                          post.author_name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#E6EDF3]">{post.author_name}</h4>
                          {isStudyPost && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#12342E] text-[#3DD6B0] border border-[#1F5A4D]">
                              📚 Study Hub
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#8B97A7]">
                          {new Date(post.created_at).toLocaleDateString()} · {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Room Jump Badge if attached */}
                    {post.room_code && (
                      <button
                        onClick={() =>
                          router.push(post.room_type === "study" ? `/study/${post.room_code}` : `/room/${post.room_code}`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#12342E] hover:bg-[#1a4a42] border border-[#1F5A4D] text-[#3DD6B0] text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <Sparkles size={13} />
                        <span>Join Room #{post.room_code}</span>
                      </button>
                    )}
                  </div>

                  {/* Post Body */}
                  <p className="text-[14px] leading-relaxed text-[#E6EDF3] whitespace-pre-wrap">
                    {post.content_text}
                  </p>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-[#232A35] pt-3 text-xs text-[#8B97A7]">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-colors ${
                          hasLiked ? "text-[#FF8A8A]" : "hover:text-[#FF8A8A]"
                        }`}
                      >
                        <Heart size={15} fill={hasLiked ? "currentColor" : "none"} />
                        <span className="font-semibold">{post.likes.length}</span>
                      </button>

                      <button
                        onClick={() =>
                          setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                        }
                        className="flex items-center gap-1.5 hover:text-[#82AAFF] transition-colors"
                      >
                        <MessageSquare size={15} />
                        <span className="font-semibold">{post.comments.length} comments</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyPostLink(post)}
                      className="flex items-center gap-1.5 hover:text-[#3DD6B0] transition-colors"
                      title="Copy link to room or post"
                    >
                      {copiedLinkPostId === post.id ? (
                        <>
                          <Check size={14} className="text-[#3DD6B0]" />
                          <span className="text-[#3DD6B0] font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={14} />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments[post.id] && (
                    <div className="flex flex-col gap-2.5 pt-2 border-t border-[#232A35]/60 animate-fadeIn">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-xl bg-[#0E1116] border border-[#232A35] p-2.5 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#E6EDF3]">{comment.author_name}</span>
                            <span className="text-[10px] text-[#8B97A7]">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[#C1CAD6]">{comment.content}</p>
                        </div>
                      ))}

                      {/* Reply Box */}
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                          placeholder="Write a comment..."
                          className="flex-1 rounded-xl bg-[#0E1116] border border-[#2B3340] px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#3DD6B0]"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="px-3.5 py-1.5 bg-[#1F5A4D] hover:bg-[#287262] text-[#3DD6B0] rounded-xl text-xs font-bold transition-all"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {/* LIVE SESSIONS & HUB TAB */}
      {activeTab === "live" && (
        <div className="flex flex-col gap-6">
          {/* Quick Session Launchers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => startRoom("study")}
              className="rounded-2xl p-5 bg-gradient-to-br from-[#12342E] to-[#141920] border border-[#1F5A4D] text-[#E6EDF3] cursor-pointer hover:border-[#3DD6B0] transition-all shadow-xl group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#1F5A4D]/50 border border-[#3DD6B0]/40 flex items-center justify-center mb-3 text-[#3DD6B0]">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#3DD6B0] transition-colors">
                  Start Atmospheric Study Room
                </h3>
                <p className="text-xs text-[#8B97A7] mb-4">
                  Multi-modal study space with ambient soundscapes, Pomodoro timer, whiteboard, and SFU video.
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRoom("study");
                }}
                className="w-full py-2 bg-[#3DD6B0] hover:bg-[#34c4a1] text-[#0E1116] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Launch Study Room →
              </button>
            </div>

            <div
              onClick={() => startRoom("coding")}
              className="rounded-2xl p-5 bg-gradient-to-br from-[#1A233A] to-[#141920] border border-[#2B3340] text-[#E6EDF3] cursor-pointer hover:border-[#82AAFF] transition-all shadow-xl group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#28385E]/50 border border-[#82AAFF]/40 flex items-center justify-center mb-3 text-[#82AAFF]">
                  <Code2 size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-[#82AAFF] transition-colors">
                  Start Live Coding Jam
                </h3>
                <p className="text-xs text-[#8B97A7] mb-4">
                  Synchronized Monaco code editor, browser execution, WebContainer terminal, and WebRTC stage.
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRoom("coding");
                }}
                className="w-full py-2 bg-[#82AAFF] hover:bg-[#6e99f5] text-[#0E1116] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Plus size={14} /> Launch Coding Jam →
              </button>
            </div>
          </div>

          {/* Active Live Rooms Grid */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#E6EDF3] flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3DD6B0] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3DD6B0]"></span>
                </span>
                Active Live Rooms ({liveRooms.length})
              </h3>
              <button
                onClick={fetchLiveRooms}
                className="text-xs text-[#8B97A7] hover:text-[#E6EDF3] transition-colors"
              >
                ↻ Refresh List
              </button>
            </div>

            {loadingRooms ? (
              <div className="py-12 text-center text-[#8B97A7] text-xs">Loading active rooms...</div>
            ) : liveRooms.length === 0 ? (
              <div className="rounded-2xl border border-[#2B3340]/60 bg-[#141920] p-8 text-center">
                <Radio size={36} className="mx-auto mb-2 text-[#8B97A7] opacity-40" />
                <p className="font-bold text-[#E6EDF3]">No active public rooms right now</p>
                <p className="text-xs text-[#8B97A7] mt-1 mb-4">
                  Launch an atmospheric study room or coding jam above to invite your peers!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveRooms.map((room) => {
                  const targetUrl = room.isStudy ? `/study/${room.room_code || room.id}` : `/room/${room.room_code || room.id}`;

                  return (
                    <div
                      key={room.id}
                      onClick={() => router.push(targetUrl)}
                      className={`rounded-2xl border p-4 bg-[#141920] cursor-pointer transition-all hover:-translate-y-0.5 shadow-md flex flex-col justify-between ${
                        room.isStudy
                          ? "border-[#1F5A4D] hover:border-[#3DD6B0]"
                          : "border-[#2B3340] hover:border-[#82AAFF]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              room.isStudy
                                ? "bg-[#12342E] text-[#3DD6B0] border border-[#1F5A4D]"
                                : "bg-[#1A233A] text-[#82AAFF] border border-[#28385E]"
                            }`}
                          >
                            {room.isStudy ? "📚 Study Hub" : "💻 Coding Jam"}
                          </span>
                          <span className="font-mono text-[11px] text-[#8B97A7]">
                            #{room.room_code}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-[#E6EDF3] mb-1 truncate" title={room.title}>
                          {room.title}
                        </h4>
                        <p className="text-xs text-[#8B97A7] mb-3">Host: {room.hostName}</p>
                      </div>

                      <button
                        className={`w-full py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 ${
                          room.isStudy
                            ? "bg-[#12342E] text-[#3DD6B0] hover:bg-[#3DD6B0] hover:text-[#0E1116]"
                            : "bg-[#1A233A] text-[#82AAFF] hover:bg-[#82AAFF] hover:text-[#0E1116]"
                        }`}
                      >
                        Enter Room →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

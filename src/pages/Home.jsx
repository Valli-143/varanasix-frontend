import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiBell, FiShare2, FiCopy } from "react-icons/fi";
import { io } from "socket.io-client";
import "./Home.css";

const API = "http://localhost:4000";
const SOCKET_URL = "http://localhost:4000";

export default function Home() {
  const navigate = useNavigate();
  const stored = JSON.parse(localStorage.getItem("user"));

  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(stored?.followingList || []);
  const [hasNewNotify, setHasNewNotify] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const [openComments, setOpenComments] = useState(null);
  const [commentText, setCommentText] = useState({});

  // ❤️ Double tap
  const lastTap = useRef(0);
  const [heartPost, setHeartPost] = useState(null);

  // 🔗 SHARE STATE (FIXED)
  const [sharePostId, setSharePostId] = useState(null);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!stored?.username) return;
    const socket = io(SOCKET_URL);
    socket.emit("join", stored.username);
    socket.on("notification", () => setHasNewNotify(true));
    return () => socket.disconnect();
  }, [stored?.username]);

  /* ================= LOAD POSTS ================= */
  useEffect(() => {
    fetch(`${API}/api/posts`)
      .then(res => res.json())
      .then(setPosts);
  }, []);

  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!search) return setResults([]);
    fetch(`${API}/api/profile/${search}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setResults(data ? [data] : []));
  }, [search]);

  /* ================= LIKE ================= */
  async function toggleLike(postId) {
    const res = await fetch(`${API}/api/posts/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: stored.username }),
    });
    const updatedPost = await res.json();
    setPosts(p => p.map(x => (x.id === postId ? updatedPost : x)));
  }

  /* ❤️ DOUBLE TAP LIKE */
  function handleDoubleTap(postId, liked) {
    const now = Date.now();
    if (now - lastTap.current < 300 && !liked) {
      showHeart(postId);
      toggleLike(postId);
    }
    lastTap.current = now;
  }

  function showHeart(postId) {
    setHeartPost(postId);
    setTimeout(() => setHeartPost(null), 700);
  }

  /* ================= COMMENT ================= */
  async function addComment(postId) {
    if (!commentText[postId]?.trim()) return;

    const res = await fetch(`${API}/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: stored.username,
        text: commentText[postId],
      }),
    });

    const updatedPost = await res.json();
    setPosts(p => p.map(x => (x.id === postId ? updatedPost : x)));
    setCommentText(t => ({ ...t, [postId]: "" }));
  }

  /* ================= SHARE HELPERS ================= */
  const postLink = id => `${window.location.origin}/post/${id}`;

  function copyLink(id) {
    navigator.clipboard.writeText(postLink(id));
    alert("Link copied!");
    setSharePostId(null);
  }

  function shareWhatsApp(id) {
    const text = encodeURIComponent(`Check this post 👇\n${postLink(id)}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setSharePostId(null);
  }

  function shareInstagram(id) {
    navigator.clipboard.writeText(postLink(id));
    window.open("https://www.instagram.com/", "_blank");
    alert("Link copied! Paste in Instagram DM or Story");
    setSharePostId(null);
  }

  return (
    <div className="home-page">
      {/* HEADER */}
      <div className="home-header">
        <div className="brand-box">
          <h1>VARANASI<span>X</span></h1>
          <p>CONNECT • SHARE • FEEL</p>
        </div>

        <div className="header-icons">
          <FiSearch className="header-icon" onClick={() => setShowSearch(!showSearch)} />
          <div className="notify-wrapper">
            <FiBell
              className="header-icon"
              onClick={() => {
                setHasNewNotify(false);
                navigate("/notifications");
              }}
            />
            {hasNewNotify && <span className="notify-dot" />}
          </div>
        </div>
      </div>

      {/* POSTS */}
      <div className="posts-list">
        {posts.map(p => {
          const liked = p.likes?.includes(stored.username);

          return (
            <div key={p.id} className="post-card">
              <div className="post-user-row">
                <span className="post-user">@{p.username}</span>
              </div>

              <div
                className="post-media heart-wrapper"
                onClick={() => handleDoubleTap(p.id, liked)}
                onDoubleClick={() => {
                  if (!liked) {
                    showHeart(p.id);
                    toggleLike(p.id);
                  }
                }}
              >
                <img src={`${API}${p.media}`} alt="" />
                {heartPost === p.id && <div className="big-heart">❤️</div>}
              </div>

              {p.caption && <p className="post-caption">{p.caption}</p>}

              {/* ACTIONS */}
              <div className="post-actions">
                <span onClick={() => toggleLike(p.id)}>
                  {liked ? "❤️" : "🤍"} {p.likes?.length || 0}
                </span>

                <span onClick={() => setOpenComments(openComments === p.id ? null : p.id)}>
                  💬 {p.comments?.length || 0}
                </span>

                {/* ✅ FIXED SHARE CLICK */}
                <span
                  role="button"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSharePostId(p.id)}
                >
                  <FiShare2 /> Share
                </span>
              </div>

              {/* COMMENTS */}
              {openComments === p.id && (
                <div className="comment-box">
                  {p.comments?.map(c => (
                    <p key={c.id}>
                      <b>@{c.username}</b> {c.text}
                    </p>
                  ))}
                  <div className="comment-input">
                    <input
                      placeholder="Add a comment..."
                      value={commentText[p.id] || ""}
                      onChange={e =>
                        setCommentText(t => ({ ...t, [p.id]: e.target.value }))
                      }
                    />
                    <button onClick={() => addComment(p.id)}>Post</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 🔗 SHARE MODAL (FIXED) */}
      {sharePostId && (
        <div className="share-overlay" onClick={() => setSharePostId(null)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <h4>Share</h4>
            <button onClick={() => copyLink(sharePostId)}>
              <FiCopy /> Copy Link
            </button>
            <button onClick={() => shareWhatsApp(sharePostId)}>WhatsApp</button>
            <button onClick={() => shareInstagram(sharePostId)}>Instagram</button>
          </div>
        </div>
      )}
    </div>
  );
}

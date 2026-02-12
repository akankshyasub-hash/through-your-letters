import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  MapPin,
  Heart,
  MessageCircle,
  Share2,
  Download,
  AlertTriangle,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../lib/api";
import { Lettering, Comment, RevisitLink } from "../types";
import { API_BASE_URL } from "../constants";
import { useToastStore } from "../store/useToastStore";
import { useAuthStore } from "../store/useAuthStore";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import ImageLightbox from "../components/ImageLightbox";

const LetteringDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { user, hydrated, hydrate } = useAuthStore();

  const [lettering, setLettering] = useState<Lettering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Like
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Revisits & Similar
  const [revisits, setRevisits] = useState<RevisitLink[]>([]);
  const [similar, setSimilar] = useState<
    Array<{
      id: string;
      thumbnail?: string;
      image_url: string;
      detected_text?: string;
    }>
  >([]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getLettering(id)
      .then((data) => {
        setLettering(data);
        setLikesCount(data.likes_count || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!id) return;
    api
      .getRevisits(id)
      .then((d) => setRevisits(d.revisits || []))
      .catch(() => {});
    api
      .getSimilar(id)
      .then((d) => setSimilar(d.similar || []))
      .catch(() => {});
  }, [id]);

  const handleLike = async () => {
    if (!id || likeLoading) return;
    setLikeLoading(true);
    try {
      const data = await api.toggleLike(id);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch {
      addToast("Failed to toggle like", "error");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `Through Your Letters: ${lettering?.detected_text || "Street Discovery"}`,
      text: `Check out this typography artifact from ${lettering?.pin_code}`,
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        addToast("Link copied to clipboard", "success");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        addToast("Share failed", "error");
    }
  };

  const handleReport = async () => {
    if (!id) return;
    const reason = window.prompt("Why are you reporting this image?");
    if (!reason) return;
    try {
      await api.reportLettering(id, reason);
      addToast("Report submitted for review", "success");
    } catch {
      addToast("Failed to submit report", "error");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Delete this upload permanently?")) return;
    try {
      await api.deleteOwnLettering(id);
      addToast("Upload deleted", "success");
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete upload";
      addToast(message, "error");
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await api.getComments(id);
      setComments(data);
      setCommentsLoaded(true);
    } catch {
      addToast("Failed to load comments", "error");
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = () => {
    if (!showComments && !commentsLoaded) fetchComments();
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast("Sign in to post comments", "warning");
      return;
    }
    if (!id || !newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      const comment = await api.addComment(id, newComment.trim());
      if (comment.status === "VISIBLE" || !comment.status) {
        setComments((prev) => [comment, ...prev]);
      } else {
        addToast("Comment submitted and held for moderator review.", "info");
      }
      setNewComment("");
    } catch {
      addToast("Failed to add comment", "error");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={48} className="animate-spin text-[#cc543a]" />
      </div>
    );
  }

  if (error || !lettering) {
    return (
      <div className="text-center py-32 space-y-6">
        <h2 className="text-4xl font-black uppercase">Not Found</h2>
        <p className="text-slate-500 font-medium">
          {error || "This lettering doesn't exist."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-[10px] font-black uppercase hover:bg-[#cc543a] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Gallery
        </button>
      </div>
    );
  }

  const title = lettering.detected_text || "Street Discovery";
  const narrative =
    lettering.description ||
    lettering.cultural_context ||
    "Archived street typography from the city.";

  return (
    <>
      <Helmet>
        <title>{title} | Through Your Letters</title>
        <meta property="og:title" content={`${title} | Through Your Letters`} />
        <meta property="og:image" content={lettering.image_url} />
        <meta property="og:description" content={narrative.substring(0, 200)} />
        <meta property="og:type" content="article" />
      </Helmet>

      {lightboxOpen && (
        <ImageLightbox
          imageUrl={lettering.image_url}
          title={title}
          letteringId={lettering.id}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-12 pb-24">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {/* Hero */}
        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-3/5 relative group">
            <div className="p-3 bg-white border-2 border-black brutalist-shadow transition-all duration-500 hover:rotate-1">
              <img
                src={lettering.image_url}
                className="w-full aspect-square object-cover contrast-125 grayscale hover:grayscale-0 transition-all duration-700 cursor-zoom-in"
                alt={title}
                onClick={() => setLightboxOpen(true)}
              />
              <div className="p-4 flex justify-between items-center border-t border-black/5 mt-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#cc543a]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {lettering.pin_code}
                  </span>
                </div>
                <Link
                  to={`/contributor/${lettering.contributor_tag}`}
                  className="text-[9px] font-black uppercase text-[#cc543a] hover:underline"
                >
                  By {lettering.contributor_tag}
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/5 flex flex-col space-y-8">
            {/* Actions */}
            <div className="flex justify-between items-start">
              <div className="flex gap-2 flex-wrap">
                {lettering.ml_metadata?.style && (
                  <span className="bg-black text-white px-4 py-1.5 text-xs font-black uppercase rotate-1 shadow-[4px_4px_0_0_#cc543a]">
                    {lettering.ml_metadata.style}
                  </span>
                )}
                {lettering.ml_metadata?.script && (
                  <span className="text-[9px] px-2 py-1 border border-black font-black uppercase bg-slate-50">
                    {lettering.ml_metadata.script}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`p-2 border-2 border-black bg-white hover:bg-red-50 transition-colors flex items-center gap-1 ${liked ? "text-[#cc543a]" : "text-slate-400"}`}
                >
                  <Heart size={16} fill={liked ? "currentColor" : "none"} />
                  <span className="text-[10px] font-black">{likesCount}</span>
                </button>
                <button
                  onClick={toggleComments}
                  className="p-2 border-2 border-black bg-white hover:bg-slate-100 flex items-center gap-1 text-slate-600"
                >
                  <MessageCircle size={16} />
                  <span className="text-[10px] font-black">
                    {lettering.comments_count || 0}
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 border-2 border-black bg-white hover:bg-slate-100"
                >
                  <Share2 size={16} />
                </button>
                <a
                  href={`${API_BASE_URL}/api/v1/letterings/${lettering.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border-2 border-black bg-white hover:bg-slate-100"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={handleReport}
                  className="p-2 border-2 border-black bg-white hover:bg-yellow-50 text-yellow-700"
                >
                  <AlertTriangle size={16} />
                </button>
                {lettering.is_owner && (
                  <button
                    onClick={handleDelete}
                    className="p-2 border-2 border-black bg-white hover:bg-red-600 hover:text-white text-red-600"
                    title="Delete your upload"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl font-black tracking-tighter leading-[0.9] drop-shadow-sm break-words">
              {title}
            </h1>

            {/* Context */}
            <div className="space-y-3">
              <p className="text-xl leading-snug font-medium text-slate-900 break-words whitespace-pre-wrap">
                {narrative}
              </p>
            </div>

            <div className="bg-[#f8f5f0] p-8 border-4 border-black border-dashed relative overflow-hidden">
              <div className="absolute -top-3 left-4 bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                Archival Record
              </div>
              <p className="serif text-lg leading-relaxed text-slate-700 italic">
                Status: {lettering.status}. Archived:{" "}
                {new Date(lettering.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Comments */}
            {showComments && (
              <div className="border-4 border-black bg-white space-y-4">
                <button
                  onClick={toggleComments}
                  className="w-full flex items-center justify-between p-4 border-b-2 border-black/10 hover:bg-slate-50"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Comments
                  </span>
                  <ChevronUp size={16} />
                </button>
                <form
                  onSubmit={handleAddComment}
                  className="px-4 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      user ? "Add a comment..." : "Sign in to comment"
                    }
                    className="flex-1 border-2 border-black p-3 text-sm font-medium outline-none focus:border-[#cc543a]"
                    disabled={commentSubmitting || !user}
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !newComment.trim() || !user}
                    className="p-3 bg-black text-white border-2 border-black hover:bg-[#cc543a] transition-colors disabled:opacity-50"
                  >
                    {commentSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
                {!user && (
                  <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Sign in from the account page to comment.
                  </p>
                )}
                <div className="px-4 pb-4 space-y-3 max-h-64 overflow-y-auto">
                  {commentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2
                        size={20}
                        className="animate-spin text-[#cc543a]"
                      />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-[10px] font-bold uppercase text-slate-400 text-center py-4">
                      No comments yet. Be the first.
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border-l-2 border-black/10 pl-3 space-y-1"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#cc543a]">
                          {comment.commenter_name || "Anonymous"}
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {comment.content}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {!showComments && (
              <button
                onClick={toggleComments}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-black transition-colors"
              >
                <ChevronDown size={14} />
                Show Comments ({lettering.comments_count || 0})
              </button>
            )}

            {/* Revisits */}
            {revisits.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#cc543a]">
                  Before / After
                </h4>
                {revisits.map((revisit) => (
                  <BeforeAfterSlider key={revisit.id} revisit={revisit} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="space-y-6 border-t-4 border-black pt-12">
            <h3 className="text-2xl font-black uppercase tracking-tighter">
              Similar Lettering
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {similar.map((item) => (
                <Link
                  key={item.id}
                  to={`/lettering/${item.id}`}
                  className="border-2 border-black p-2 bg-white hover:-translate-y-1 transition-transform group"
                >
                  <img
                    src={item.thumbnail || item.image_url}
                    alt={item.detected_text || "Similar lettering"}
                    className="w-full aspect-square object-cover border border-black/20 grayscale group-hover:grayscale-0 transition-all"
                  />
                  <p className="text-[9px] font-black uppercase truncate mt-2">
                    {item.detected_text || "Discovery"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LetteringDetailPage;

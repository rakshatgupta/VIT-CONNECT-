import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { coreApi } from '../api';
import useAuthStore from '../store/authStore';
import { ThumbsUp, ThumbsDown, Image as ImageIcon, MessageSquare, Send, Search, Trash2, CircleCheck, Reply } from 'lucide-react';

function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formData, setFormData] = useState({ text: '', category: 'Campus life' });
  const attachment = useRef(null);
  const [postStatus, setPostStatus] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTargets, setReplyTargets] = useState({});
  const [commentPending, setCommentPending] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const { user, isAuthenticated } = useAuthStore();
  const categories = ['Faculties', 'Hostel rooms', 'Mess food', 'Transportation', 'Campus life'];

  const fetchFeedbacks = async () => {
    try {
      const res = await coreApi.get('/feedback');
      setFeedbacks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchFeedbacks();
    else setLoading(false);
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (posting || !formData.text.trim()) return;
    setPosting(true);
    setPostStatus('');

    const fd = new FormData();
    fd.append('text', formData.text);
    fd.append('category', formData.category);
    if (file) fd.append('media', file);

    try {
      const { data } = await coreApi.post('/feedback', fd);
      setFeedbacks(posts => [data, ...posts.filter(post => post._id !== data._id)]);
      setPostStatus('Feedback uploaded successfully.');
      setFormData({ ...formData, text: '' });
      setFile(null);
      attachment.current.value = '';
    } catch (err) {
      console.error('Failed to post feedback', err);
      alert(typeof err.response?.data === 'string' ? err.response.data : 'Unable to upload feedback.');
    } finally {
      setPosting(false);
    }
  };

  const handleVote = async (id, type) => {
    try {
      await coreApi.put(`/feedback/${id}/${type}`);
      fetchFeedbacks();
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const handlePostComment = async (id) => {
    const text = commentInputs[id]?.trim();
    if (!text || commentPending[id]) return;
    setCommentPending(current => ({ ...current, [id]: true }));
    setCommentErrors(current => ({ ...current, [id]: '' }));

    try {
      const { data } = await coreApi.post(`/feedback/${id}/comment`, { text, replyTo: replyTargets[id] });
      setFeedbacks(posts => posts.map(post => post._id === id ? data : post));
      setCommentInputs(current => ({ ...current, [id]: '' }));
      setReplyTargets(current => ({ ...current, [id]: undefined }));
    } catch (err) {
      setCommentErrors(current => ({ ...current, [id]: typeof err.response?.data === 'string' ? err.response.data : 'Unable to post your comment.' }));
    } finally {
      setCommentPending(current => ({ ...current, [id]: false }));
    }
  };

  const handleDeletePost = async (id) => {
    if(!window.confirm('Delete this feedback?')) return;
    try {
      await coreApi.put(`/feedback/${id}/delete`);
      fetchFeedbacks();
    } catch (err) {
      console.error('Failed to delete', err);
      alert('Error updating database: ' + (err.response?.data || 'Server Not Found/Offline'));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if(!window.confirm('Delete this reply?')) return;
    try {
      await coreApi.put(`/feedback/${postId}/comment/${commentId}/delete`);
      fetchFeedbacks();
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert('Error updating database: ' + (err.response?.data || 'Server Not Found/Offline'));
    }
  };

  const toggleComments = (id) => {
    setExpandedComments({ ...expandedComments, [id]: !expandedComments[id] });
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    f.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <header className="portal-heading">
        <div>
          <h1>Campus feedback</h1>
          <p>Discuss classes, facilities, and campus life under your student alias.</p>
        </div>
        <span className="heading-mark"><MessageSquare aria-hidden="true" /></span>
      </header>

      {!isAuthenticated ? (
        <div className="empty-state">
          <p>Sign in with your Campus Connect account to read or share feedback.</p>
          <Link className="btn" to="/login" state={{ from: '/feedback' }}>Sign in</Link>
        </div>
      ) : (
        <div className="feedback-layout">
          <section className="glass-card feedback-compose" aria-labelledby="feedback-compose-title">
            <h2 id="feedback-compose-title">Share feedback</h2>
          <form onSubmit={handleSubmit}>
            <div role="status">{postStatus && <p className="feedback-success"><CircleCheck size={19} aria-hidden="true" /> {postStatus}</p>}</div>
            <textarea
              className="input-field"
              rows="3"
              aria-label="Your feedback" placeholder="What is working well? What could improve?"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              required
              style={{ resize: 'vertical' }}
            />

            {file && <div style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '0.9rem' }}>Attached: {file.name}</div>}

            <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '1rem' }}>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="select-field" aria-label="Feedback category"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>


              </div>
              <label className="feedback-attachment">
                <ImageIcon size={18} aria-hidden="true" /> Attachment (optional)
                <input ref={attachment} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              <button type="submit" className="btn" disabled={posting}>{posting ? 'Uploading…' : 'Post feedback'}</button>
            </div>
          </form>
          </section>
          <section className="feedback-feed" aria-labelledby="feedback-feed-title">
            <h2 id="feedback-feed-title">Recent feedback</h2>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input
            type="text"
            aria-label="Search feedback" placeholder="Search feedback or categories"
            className="input-field"
            style={{ paddingLeft: '2.5rem', marginBottom: 0, borderRadius: 'var(--radius-lg)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        </div>



        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? <p className="text-center">Loading feedback…</p> :
            filteredFeedbacks.length === 0 ? <p className="text-center" style={{ color: 'var(--text-secondary)' }}>No feedback found.</p> :
            filteredFeedbacks.map(f => {
              const hasUpvoted = f.upvotedBy?.includes(user?.id);
              const hasDownvoted = f.downvotedBy?.includes(user?.id);
              const comments = new Map(f.comments?.map(comment => [comment._id, comment]));
              const target = comments.get(replyTargets[f._id]);
              const isCommentsExpanded = expandedComments[f._id];

              return (
                <div key={f._id} className="glass-card" style={{ padding: '1.2rem', boxSizing: 'border-box' }}>
                  <div className="flex-between mb-2">
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{f.authorAlias || 'Anonymous Student'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {f.ownedByViewer && !f.isDeleted && (
                        <button onClick={() => handleDeletePost(f._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }} title="Delete Post">
                          <Trash2 size={16} />
                        </button>
                      )}
                      <span style={{ background: 'var(--surface-hover)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {f.category}
                      </span>
                    </div>
                  </div>

                  {f.isDeleted ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', margin: '1rem 0' }}>[This feedback was deleted by the author]</p>
                  ) : (
                    <>
                      <p style={{ marginBottom: f.mediaUrl ? '1rem' : '1.5rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{f.text}</p>

                      {f.mediaUrl && (
                        <div style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                          {f.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                            <video src={f.mediaUrl} controls style={{ width: '100%', display: 'block' }} />
                          ) : (
                            <img src={f.mediaUrl} alt="Feedback attachment" style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }} />
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    {!f.isDeleted && (
                      <>
                        <button onClick={() => handleVote(f._id, 'upvote')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: hasUpvoted ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
                          <ThumbsUp size={16} fill={hasUpvoted ? 'currentColor' : 'none'} /> {f.upvotes}
                        </button>
                        <button onClick={() => handleVote(f._id, 'downvote')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: hasDownvoted ? 'var(--danger)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
                          <ThumbsDown size={16} fill={hasDownvoted ? 'currentColor' : 'none'} /> {f.downvotes}
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleComments(f._id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                      <MessageSquare size={16} /> {f.comments?.length || 0}
                    </button>
                    <span className="text-sm" style={{ marginLeft: 'auto' }}>
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isCommentsExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {f.comments?.map(c => (
                        <div key={c._id} id={`comment-${c._id}`} style={{ marginBottom: '0.8rem', background: 'var(--bg-color)', padding: '0.8rem', borderRadius: 'var(--radius-md)' }}>
                          <div className="flex-between" style={{ marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{c.authorAlias || 'Anonymous Reply'}</span>
                            {c.ownedByViewer && !c.isDeleted && (
                              <button onClick={() => handleDeleteComment(f._id, c._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }} title="Delete Reply">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {!c.isDeleted && c.replyTo && (
                            <p className="feedback-reply-label">
                              <Reply size={14} aria-hidden="true" />
                              {comments.get(c.replyTo)?.isDeleted ? 'In reply to a deleted comment' : `In reply to ${comments.get(c.replyTo)?.authorAlias || 'an anonymous comment'}`}
                              <a href={`#comment-${c.replyTo}`}>View comment</a>
                            </p>
                          )}
                          {c.isDeleted ? (
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>[This reply was deleted]</p>
                          ) : (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>{c.text}</p>
                          )}
                          {!c.isDeleted && !f.isDeleted && (
                            <button type="button" className="feedback-reply-action" disabled={commentPending[f._id]} onClick={() => {
                              setReplyTargets(current => ({ ...current, [f._id]: c._id }));
                              document.getElementById(`comment-input-${f._id}`)?.focus();
                            }}><Reply size={14} aria-hidden="true" /> Reply</button>
                          )}
                        </div>
                      ))}

                      {!f.isDeleted && (
                        <form className="feedback-comment-form" onSubmit={event => { event.preventDefault(); handlePostComment(f._id); }}>
                          {target && (
                            <p className="feedback-reply-label">Replying to {target.authorAlias || 'an anonymous comment'}
                              <button className="feedback-reply-action" type="button" onClick={() => setReplyTargets(current => ({ ...current, [f._id]: undefined }))}>Cancel reply</button>
                            </p>
                          )}
                          <div className="feedback-comment-input">
                            <input id={`comment-input-${f._id}`} type="text" required maxLength={2000}
                              aria-label={target ? 'Your reply' : 'Your comment'} placeholder={target ? 'Write a reply…' : 'Add an anonymous comment…'}
                              className="input-field" value={commentInputs[f._id] || ''}
                              onChange={event => setCommentInputs(current => ({ ...current, [f._id]: event.target.value }))} />
                            <button type="submit" aria-label={target ? 'Send reply' : 'Send comment'} className="btn" disabled={commentPending[f._id]}><Send size={16} aria-hidden="true" /></button>
                          </div>
                          {commentErrors[f._id] && <p role="alert">{commentErrors[f._id]}</p>}
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Feedback;

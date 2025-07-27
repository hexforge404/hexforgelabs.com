// pages/BlogPost.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './BlogPost.css';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/slug/${slug}`);
        const data = await res.json();
        setPost(data);
      } catch (err) {
        setError('Failed to load blog post');
      }
    };

    fetchPost();
  }, [slug]);

  if (error) return <div className="blog-error">{error}</div>;
  if (!post) return <div className="blog-loading">Loading...</div>;

  return (
    <div className="blog-post">
      <h1>{post.title}</h1>
      {post.image && <img src={post.image} alt={post.title} className="post-cover" />}
      <div className="post-meta">
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        <span>• Visibility: {post.visibility}</span>
      </div>
      <div className="post-content">{post.content}</div>
      {post.video && (
        <div className="post-video">
          <iframe
            width="100%"
            height="315"
            src={post.video}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
      {post.affiliateLink && (
        <a href={post.affiliateLink} className="affiliate-link" target="_blank" rel="noopener noreferrer">
          Shop Now
        </a>
      )}
    </div>
  );
};

export default BlogPost;

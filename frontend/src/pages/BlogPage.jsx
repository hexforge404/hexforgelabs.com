import React, { useEffect, useState } from 'react';
import './BlogPage.css';
import BlogCard from '../components/BlogCard'; // adjust path if needed
import { Link } from 'react-router-dom';

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/blog');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        setError('Failed to fetch blog posts');
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) return <div className="blog-loading">Loading blog posts...</div>;
  if (error) return <div className="blog-error">{error}</div>;

  return (
    <div className="blog-page">
      <h1 className="blog-title">📝 HexForge Blog</h1>
  
      <div className="blog-grid">
        {posts.length === 0 ? (
          <p className="blog-empty">No blog posts available.</p>
        ) : (
          posts.map((post) => (
            <BlogCard key={post._id} post={post} />
          ))
        )}
      </div>
    </div>
  );
  
  
  
  
}

export default BlogPage;

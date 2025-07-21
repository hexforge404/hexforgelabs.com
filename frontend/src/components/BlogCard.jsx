import React from 'react';
import PropTypes from 'prop-types';
import './BlogCard.css';
import { Link } from 'react-router-dom';

const BlogCard = ({ post }) => {
  const {
    title,
    slug,
    image,
    content,
    video,
    affiliateLink,
    tags,
    createdAt,
    visibility
  } = post;

  return (
    <div className="blog-card">
      {image && <img src={image} alt={title} className="blog-cover" />}
      <div className="blog-content">
        <h2>{title}</h2>
        <p className="blog-snippet">{content.slice(0, 120)}...</p>

        {video && (
          <div className="blog-video">
            <iframe
              width="100%"
              height="215"
              src={video}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}

        {affiliateLink && (
          <div className="affiliate-links">
            <a href={affiliateLink} target="_blank" rel="noopener noreferrer" className="affiliate-button">
              🔗 Affiliate Link
            </a>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="blog-meta">Tags: {tags.join(', ')}</div>
        )}

        <p className="blog-meta">
          {new Date(createdAt).toLocaleDateString()} • Visibility: {visibility}
        </p>

        <Link to={`/blog/${slug}`} className="blog-readmore">
          Read Full Post →
        </Link>
      </div>
    </div>
  );
};

BlogCard.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string.isRequired,
    slug: PropTypes.string,
    image: PropTypes.string,
    content: PropTypes.string.isRequired,
    video: PropTypes.string,
    affiliateLink: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    createdAt: PropTypes.string,
    visibility: PropTypes.string
  }).isRequired
};

export default BlogCard;

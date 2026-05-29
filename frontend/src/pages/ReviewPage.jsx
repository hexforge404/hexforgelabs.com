import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ReviewPage.css';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
  headers: {
    Accept: 'application/json'
  }
});

const PRODUCT_OPTIONS = [
  'Custom Lithophane Lamp',
  'Multi-Panel Lamp',
  'Night Light',
  'Other'
];

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const initialForm = {
  customerName: '',
  email: '',
  productType: '',
  rating: '',
  reviewText: '',
  permissionToDisplay: false,
  permissionToUseName: false
};

const ReviewPage = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoUploadKey, setPhotoUploadKey] = useState(0);
  const [videoUploadKey, setVideoUploadKey] = useState(0);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.customerName.trim()) {
      return 'Please enter your name.';
    }

    if (!form.productType) {
      return 'Please select a product type.';
    }

    if (!form.rating) {
      return 'Please choose a rating.';
    }

    if (!form.reviewText.trim()) {
      return 'Please share your review.';
    }

    if (!form.permissionToDisplay) {
      return 'Please allow HexForge Labs to display the review before submitting.';
    }

    return '';
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (photoFiles.length > 5) {
      setError('Please upload 5 photos or fewer.');
      return;
    }

    if (videoFile && photoFiles.length + 1 > 6) {
      setError('Too many files selected. Maximum 6 total files.');
      return;
    }

    if (photoFiles.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setError('That file type is not supported. Please use JPG, PNG, WEBP, MP4, WEBM, or MOV.');
      return;
    }

    if (videoFile && !ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      setError('That file type is not supported. Please use JPG, PNG, WEBP, MP4, WEBM, or MOV.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('customerName', form.customerName.trim());
      if (form.email.trim()) {
        formData.append('email', form.email.trim());
      }
      formData.append('productType', form.productType);
      formData.append('rating', String(form.rating));
      formData.append('reviewText', form.reviewText.trim());
      formData.append('permissionToDisplay', String(form.permissionToDisplay));
      formData.append('permissionToUseName', String(form.permissionToUseName));

      photoFiles.forEach((file) => {
        formData.append('photos', file);
      });

      if (videoFile) {
        formData.append('video', videoFile);
      }

      await api.post('/reviews', formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        },
      });

      setSuccess(true);
      setForm(initialForm);
      setPhotoFiles([]);
      setVideoFile(null);
      setPhotoUploadKey((prev) => prev + 1);
      setVideoUploadKey((prev) => prev + 1);
    } catch (err) {
      console.error('Review submission failed:', err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Submission failed. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5) {
      setError('Please upload 5 photos or fewer.');
      setPhotoFiles(files.slice(0, 5));
      setPhotoUploadKey((prev) => prev + 1);
      return;
    }

    if (files.some((file) => !ALLOWED_IMAGE_TYPES.has(file.type))) {
      setError('That file type is not supported. Please use JPG, PNG, WEBP, MP4, WEBM, or MOV.');
      setPhotoFiles([]);
      setPhotoUploadKey((prev) => prev + 1);
      return;
    }
    setError('');
    setPhotoFiles(files);
  };

  const handleVideoChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 1) {
      setError('Please upload only one video.');
      setVideoFile(null);
      setVideoUploadKey((prev) => prev + 1);
      return;
    }
    const nextVideo = files[0] || null;
    if (nextVideo && !ALLOWED_VIDEO_TYPES.has(nextVideo.type)) {
      setError('That file type is not supported. Please use JPG, PNG, WEBP, MP4, WEBM, or MOV.');
      setVideoFile(null);
      setVideoUploadKey((prev) => prev + 1);
      return;
    }
    setError('');
    setVideoFile(nextVideo);
  };

  useEffect(() => {
    const previews = photoFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotoPreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoFiles]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const handleRemovePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPhotoUploadKey((prev) => prev + 1);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoUploadKey((prev) => prev + 1);
  };

  return (
    <div className="review-page">
      <section className="review-hero">
        <div className="review-hero-content">
          <p className="review-hero-kicker">HexForge Labs</p>
          <h1>How did your custom lamp turn out?</h1>
          <p className="review-hero-copy">
            Your feedback helps HexForge Labs improve future custom lamps and helps
            other customers feel confident ordering. Reviews are checked before they
            appear publicly.
          </p>
        </div>
      </section>

      <section className="review-card">
        {success ? (
          <div className="review-success">
            <h2>Thank you!</h2>
            <p>
              Thank you — your review was submitted and will be reviewed before
              being posted.
            </p>
            <button
              type="button"
              className="review-reset"
              onClick={() => setSuccess(false)}
            >
              Submit another review
            </button>
          </div>
        ) : (
          <form className="review-form" onSubmit={handleSubmit}>
            <div className="review-form-header">
              <h2>Leave a Review</h2>
              <p>All submissions are reviewed within 1-2 business days.</p>
            </div>

            {error && <div className="review-error">{error}</div>}

            <div className="review-grid">
              <label>
                Name
                <input
                  type="text"
                  value={form.customerName}
                  onChange={event => updateField('customerName', event.target.value)}
                  required
                  placeholder="Jane Doe"
                />
              </label>

              <label>
                Email (optional)
                <input
                  type="email"
                  value={form.email}
                  onChange={event => updateField('email', event.target.value)}
                  placeholder="jane@email.com"
                />
              </label>

              <label>
                Product type
                <select
                  value={form.productType}
                  onChange={event => updateField('productType', event.target.value)}
                  required
                >
                  <option value="">Select one</option>
                  {PRODUCT_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Rating
                <select
                  value={form.rating}
                  onChange={event => updateField('rating', event.target.value)}
                  required
                >
                  <option value="">Choose</option>
                  {[5, 4, 3, 2, 1].map(value => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="review-text">
              Review
              <textarea
                value={form.reviewText}
                onChange={event => updateField('reviewText', event.target.value)}
                required
                placeholder="What did you love about your HexForge build?"
              />
            </label>

            <div className="review-upload">
              <div className="review-upload-header">
                <strong>Optional media</strong>
                <span>Optional: upload photos or a short video of your finished lamp. Uploads are reviewed before anything appears publicly.</span>
                <ul className="review-upload-limits">
                  <li>Up to 5 photos (JPG, PNG, WEBP)</li>
                  <li>1 short video (MP4, WEBM, MOV)</li>
                </ul>
              </div>
              <div className="review-upload-grid">
                <label className="review-upload-field">
                  Upload photos
                  <input
                    key={`photos-${photoUploadKey}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoChange}
                  />
                  <span className="review-upload-help">Up to 5 photos.</span>
                </label>
                <label className="review-upload-field">
                  Upload a short video
                  <input
                    key={`video-${videoUploadKey}`}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoChange}
                  />
                  <span className="review-upload-help">Up to 1 video.</span>
                </label>
              </div>
              {photoPreviews.length > 0 && (
                <div className="review-preview-grid">
                  {photoPreviews.map((preview, index) => (
                    <div key={`${preview.file.name}-${index}`} className="review-preview-card">
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        className="review-preview-image"
                      />
                      <div className="review-preview-meta">
                        <span>{preview.file.name}</span>
                        <button
                          type="button"
                          className="review-preview-remove"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {videoFile && (
                <div className="review-preview-video">
                  {videoPreviewUrl && (
                    <video className="review-preview-video-player" controls src={videoPreviewUrl} />
                  )}
                  <div className="review-preview-meta">
                    <span>{videoFile.name}</span>
                    <button
                      type="button"
                      className="review-preview-remove"
                      onClick={handleRemoveVideo}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="review-flags">
              <label>
                <input
                  type="checkbox"
                  checked={form.permissionToDisplay}
                  onChange={event =>
                    updateField('permissionToDisplay', event.target.checked)
                  }
                  required
                />
                I give permission to display this review.
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.permissionToUseName}
                  onChange={event =>
                    updateField('permissionToUseName', event.target.checked)
                  }
                />
                You may show my name with the review.
              </label>
            </div>

            <button
              type="submit"
              className="review-submit"
              disabled={submitting}
            >
              {submitting ? (uploadProgress ? `Uploading ${uploadProgress}%...` : 'Submitting...') : 'Submit review'}
            </button>
            <p className="review-safety-note">
              Safety note: for lithophane lamps, use LED bulbs only and avoid high-heat bulbs.
            </p>
          </form>
        )}
      </section>
    </div>
  );
};

export default ReviewPage;

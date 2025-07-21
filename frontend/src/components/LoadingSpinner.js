import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ small = false }) => (
  <div className={`spinner-container ${small ? 'small' : ''}`}>
    <div className="spinner"></div>
  </div>
);

export default LoadingSpinner;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Remove this import since we're using AdminPage.css
// import './AdminPanel.css'; 

const AdminPanel = () => {
  // ... (keep all existing state and logic the same)

  return (
    <div className="admin-container"> {/* Changed from admin-panel */}
      <h2 className="section-header">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
      
      <form className="form-section" onSubmit={handleSubmit}> {/* Added form-section class */}
        <div className="form-grid"> {/* Changed from form-group to form-grid */}
          <div className="form-group">
            <label className="form-label">Name</label> {/* Added form-label */}
            <input 
              type="text"
              className="form-input" {/* Added */}
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input" {/* Added */}
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              required
            />
          </div>

          <div className="form-row"> {/* Keep or change to form-grid if preferred */}
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input
                type="number"
                className="form-input" {/* Added */}
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => setForm({...form, price: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stock</label>
              <input
                type="number"
                className="form-input" {/* Added */}
                min="0"
                value={form.stock}
                onChange={(e) => setForm({...form, stock: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input
              type="url"
              className="form-input" {/* Added */}
              value={form.image}
              onChange={(e) => setForm({...form, image: e.target.value})}
            />
            {form.image && (
              <div className="image-preview">
                <img src={form.image} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Categories (comma separated)</label>
            <input
              type="text"
              className="form-input" {/* Added */}
              value={form.categories}
              onChange={(e) => setForm({...form, categories: e.target.value})}
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured}
              onChange={(e) => setForm({...form, isFeatured: e.target.checked})}
            />
            <label className="form-label" htmlFor="isFeatured">Featured Product</label>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="action-button primary-button" {/* Updated */}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span> {/* Added spinner */}
                Processing...
              </>
            ) : editingId ? 'Update Product' : 'Add Product'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={resetForm} 
              className="action-button secondary-button" {/* Updated */}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="section-header">Product Inventory ({products.length})</h2>
      
      {isLoading && !products.length ? (
        <div className="loading">
          <span className="spinner"></span> {/* Added spinner */}
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">No products found</div> {/* Added empty state */}
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div key={product._id} className="product-card">
              <div className="product-image">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = ''; // Will fallback to placeholder
                    }}
                  />
                ) : (
                  <div className="image-placeholder">No Image</div>
                )}
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="product-meta">${product.price.toFixed(2)}</p> {/* Added class */}
                <p className="product-meta">Stock: {product.stock || 0}</p> {/* Added class */}
                {product.isFeatured && <span className="featured-badge">Featured</span>}
                <div className="product-actions">
                  <button 
                    onClick={() => editProduct(product)} 
                    className="action-button secondary-button" {/* Updated */}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteProduct(product._id)} 
                    className="action-button danger-button" {/* Updated */}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

// frontend/src/components/InventoryViewer.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../utils/apiBase';

function getPlainText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') {
    return (prop.title || []).map((t) => t.plain_text).join(' ');
  }
  if (prop.type === 'rich_text') {
    return (prop.rich_text || []).map((t) => t.plain_text).join(' ');
  }
  return '';
}

function getSelectName(prop) {
  if (!prop || prop.type !== 'select' || !prop.select) return '';
  return prop.select.name || '';
}

function getMultiSelectNames(prop) {
  if (!prop || prop.type !== 'multi_select') return [];
  return (prop.multi_select || []).map((opt) => opt.name);
}

function getNumber(prop) {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

export default function InventoryViewer() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchInventory() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE_URL}/notion/inventory`);
        const data = res.data;

        if (!data || !Array.isArray(data.results)) {
          throw new Error('Unexpected Notion response format');
        }

        const normalized = data.results.map((page) => {
          const props = page.properties || {};

          const itemName = getPlainText(props['Item']);
          const category = getSelectName(props['Category']);
          const qty = getNumber(props['Quantity']);
          const location = getPlainText(props['Location']);
          const notes = getPlainText(props['Notes']);
          const usedInOptions = getMultiSelectNames(props['Used In']);
          const price = getNumber(props['Price per piece']);

          return {
            id: page.id,
            itemName,
            category,
            qty,
            location,
            notes,
            usedIn: usedInOptions,
            price,
            notionUrl: page.url,
          };
        });

        if (!cancelled) {
          setRows(normalized);
        }
      } catch (err) {
        console.error('Inventory fetch error:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load inventory');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="inventory-panel">
        <h2 className="section-header">INVENTORY (Notion)</h2>
        <p className="inventory-status">Loading inventory…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-panel">
        <h2 className="section-header">INVENTORY (Notion)</h2>
        <p className="inventory-status error-message">
          Failed to load inventory: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="inventory-panel">
      <h2 className="section-header">INVENTORY (Notion)</h2>

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Price/ea</th>
              <th>Used In</th>
              <th>Location</th>
              <th>Notes</th>
              <th>Notion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="inventory-item-cell">{row.itemName || '—'}</td>
                <td>{row.category || '—'}</td>
                <td>{typeof row.qty === 'number' ? row.qty : '—'}</td>
                <td>
                  {typeof row.price === 'number'
                    ? `$${row.price.toFixed(2)}`
                    : '—'}
                </td>
                <td className="inventory-usedin-cell">
                  {row.usedIn && row.usedIn.length > 0
                    ? row.usedIn.join(', ')
                    : '—'}
                </td>
                <td>{row.location || '—'}</td>
                <td className="inventory-notes-cell">
                  {row.notes || '—'}
                </td>
                <td>
                  {row.notionUrl ? (
                    <a
                      href={row.notionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inventory-link"
                    >
                      Open
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '1rem' }}>
                  No inventory items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="inventory-footnote">
        Inventory is read-only from Notion. Update the{' '}
        <strong>📦 Inventory Tracker</strong> database in Notion and refresh
        this page to see changes.
      </p>
    </div>
  );
}

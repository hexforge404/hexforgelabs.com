// frontend/src/components/GlobalNav.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import './GlobalNav.css';
import { useAdmin } from '../context/AdminContext';

const baseRoutes = [
  { path: '/', label: 'Home' },
  { path: '/store', label: 'Store' },
  { path: '/chat', label: 'Chat' },
  { path: '/assistant', label: 'Full Assistant' },
  { path: '/script-lab', label: 'Script Lab' },
  { path: '/heightmap', label: 'Heightmap' },
  { path: '/surface', label: 'Surface' },
  { path: '/blog', label: 'Blog' }
];

const GlobalNav = ({ onLogout, member, onMemberLogout }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAdmin();

  const toggle = () => setOpen(v => !v);
  const close = () => setOpen(false);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const routes = isAdmin ? [...baseRoutes, { path: '/admin', label: 'Admin' }] : baseRoutes;
  const showAdminLogout = isAdmin && onLogout;

  return (
    <div className="hf-global-nav">
      <button
        className="hf-nav-toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Toggle navigation"
      >
        <span className="hf-nav-toggle-dot" />
        <span className="hf-nav-toggle-label">Menu</span>
      </button>

      {open && (
        <div className="hf-nav-panel">
          <div className="hf-nav-panel-header">
            <div className="hf-nav-brand">
              <span className="hf-nav-logo">☠</span>
              <span className="hf-nav-title">HexForge Labs</span>
            </div>
            <button className="hf-nav-close" onClick={close}>
              ✕
            </button>
          </div>

          <div className="hf-nav-links">
            {routes.map(r => {
              const active = location.pathname === r.path;
              return (
                <Link
                  key={r.path}
                  to={r.path}
                  onClick={close}
                  className={
                    'hf-nav-link' + (active ? ' hf-nav-link--active' : '')
                  }
                >
                  {r.label}
                </Link>
              );
            })}

            {/* Member account controls */}
            {member ? (
              <>
                <Link
                  to="/account"
                  onClick={close}
                  className={
                    'hf-nav-link' +
                    (location.pathname === '/account'
                      ? ' hf-nav-link--active'
                      : '')
                  }
                >
                  Account ({member.username})
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onMemberLogout?.();
                    close();
                  }}
                  className="hf-nav-link hf-nav-link--danger"
                >
                  🔒 Log Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={close}
                className={
                  'hf-nav-link' +
                  (location.pathname === '/login'
                    ? ' hf-nav-link--active'
                    : '')
                }
              >
                Sign In
              </Link>
            )}

            {/* Admin controls visible while session is active */}
            {showAdminLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  close();
                }}
                className="hf-nav-link hf-nav-link--danger"
              >
                🧱 Admin Log Out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

GlobalNav.propTypes = {
  onLogout: PropTypes.func,
  member: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string
  }),
  onMemberLogout: PropTypes.func
};

export default GlobalNav;

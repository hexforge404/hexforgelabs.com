import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import './GlobalNav.css';

const routes = [
  { path: '/', label: 'Home' },
  { path: '/store', label: 'Store' },
  { path: '/chat', label: 'Chat' },
  { path: '/assistant', label: 'Full Assistant' },
  { path: '/script-lab', label: 'Script Lab' },
  { path: '/blog', label: 'Blog' },
];

const GlobalNav = ({ onLogout, member, onMemberLogout }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const toggle = () => setOpen(v => !v);
  const close = () => setOpen(false);

  const isAdminRoute = location.pathname === '/admin';

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
            {routes.map((r) => {
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

            {/* ------------------------------
                MEMBER ACCOUNT / LOGIN BUTTON
               ------------------------------ */}
            <Link
              to={member ? '/account' : '/login'}
              onClick={close}
              className={
                'hf-nav-link' +
                (location.pathname === '/account' ? ' hf-nav-link--active' : '')
              }
            >
              {member ? `Account (${member.username})` : 'Sign In'}
            </Link>

            {/* ------------------------------
                MEMBER LOGOUT BUTTON
               ------------------------------ */}
            {member && (
              <button
                type="button"
                onClick={() => {
                  onMemberLogout && onMemberLogout();
                  close();
                }}
                className="hf-nav-link hf-nav-link--danger"
              >
                🔓 Log Out
              </button>
            )}

            {/* ------------------------------
                ADMIN LOGOUT BUTTON 
                Only appears on /admin
               ------------------------------ */}
            {isAdminRoute && onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  close();
                }}
                className="hf-nav-link hf-nav-link--danger"
              >
                🚪 Admin Log Out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

GlobalNav.propTypes = {
  onLogout: PropTypes.func,        // Admin logout
  member: PropTypes.object,        // Member user object
  onMemberLogout: PropTypes.func,  // Member logout
};

export default GlobalNav;

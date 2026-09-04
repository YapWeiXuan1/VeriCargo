import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import vericargoLogo from "../assets/vericargo-logo.png";
import { useAuth } from "../context/auth";
import useWallet from "../hooks/useWallet";
import WorkflowNotifications from "./WorkflowNotifications";

function AppLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionLock, setTransactionLock] = useState(null);
  const { user, logout } = useAuth();
  const { disconnect } = useWallet();

  const openMenu = () => {
    clearTimeout(closeTimerRef.current);
    setMenuOpen(true);
  };
  const scheduleMenuClose = () => {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 180);
  };

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleLock = (event) =>
      setTransactionLock(event.detail?.locked ? event.detail : null);
    window.addEventListener("vericargo:transaction-lock", handleLock);
    return () =>
      window.removeEventListener("vericargo:transaction-lock", handleLock);
  }, []);

  useEffect(() => {
    if (!transactionLock) return undefined;
    const preventExit = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [transactionLock]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    disconnect();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell app-shell--hybrid">
      <header
        className="system-bar system-bar--dashboard-link"
        onClick={(event) => {
          if (!event.target.closest('button, a, [role="menu"]'))
            navigate("/dashboard");
        }}
      >
        <button
          className={`mobile-nav-toggle ${sidebarOpen ? "is-active" : ""}`}
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-controls="mobile-sidebar"
          aria-expanded={sidebarOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <Link
          className="system-brand"
          to="/dashboard"
          aria-label="VeriCargo dashboard"
        >
          <img className="system-brand__icon" src={vericargoLogo} alt="" />
          <span>VeriCargo</span>
        </Link>
        <WorkflowNotifications />
        <div
          className="profile-menu"
          ref={menuRef}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleMenuClose}
        >
          <button
            className="profile-button"
            type="button"
            onFocus={openMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="profile-button__avatar">
              {(user?.fullName || "U").slice(0, 1).toUpperCase()}
            </span>
            <span>Profile</span>
          </button>
          {menuOpen && (
            <div className="profile-menu__dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
              >
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/wallet");
                }}
              >
                Wallet
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
              >
                Settings
              </button>
              <button
                className="profile-menu__logout"
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="app-layout-body">
        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <Sidebar
          user={user}
          open={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />
        <div className="app-workspace">
          <main className="app-main app-main--hybrid">
            <div className="app-topbar">
              <div className="app-topbar__title">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {actions && <div className="app-topbar__actions">{actions}</div>}
            </div>
            {children}
          </main>
        </div>
      </div>
      {transactionLock && (
        <div
          className="transaction-lock"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="transaction-lock__card">
            <span
              className="state-spinner state-spinner--large"
              aria-hidden="true"
            />
            <h2>Transaction in progress</h2>
            <p>{transactionLock.message}</p>
            <small>
              Do not close, refresh, or navigate away from this page.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;

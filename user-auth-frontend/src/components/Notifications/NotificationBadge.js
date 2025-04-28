import React from "react";
import { Link } from "react-router-dom";
import { Bell } from "react-feather";
import "./Notifications.css";

const NotificationBadge = ({ count = 0, showText = false, isLink = true, wrapInLink = true }) => {
  const badgeContent = (
    <div className="nav-icon-container">
      <Bell size={20} color="currentColor" className="notification-icon" />
      {count > 0 && <div className="notification-badge">{count > 9 ? '9+' : count}</div>}
      {showText && <span className="notification-text">Notifications</span>}
    </div>
  );

  // For backward compatibility
  const shouldWrapInLink = wrapInLink !== undefined ? wrapInLink : isLink;

  if (shouldWrapInLink) {
    return (
      <Link to="/notifications" className="notification-link">
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
};

export default NotificationBadge; 
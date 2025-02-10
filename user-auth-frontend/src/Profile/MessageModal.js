import React, { useState } from 'react';
import { X, Send, Smile, Image, Paperclip } from 'lucide-react';
import './MessageModal.css';

const MessageModal = ({ isOpen, onClose, recipient }) => {
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(`Sending message to ${recipient}: ${message}`);
        setMessage('');
        onClose();
    };

    return (
        <div className="message-modal-overlay">
            <div className="message-modal">
                <div className="message-modal-header">
                    <div className="recipient-info">
                        <div className="recipient-avatar">
                            {recipient?.[0]?.toUpperCase()}
                        </div>
                        <div className="recipient-details">
                            <h3>{recipient}</h3>
                            <span className="recipient-status">Active now</span>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="message-content">
                    <div className="message-history">
                        <div className="message-date-divider">
                            <span>Today</span>
                        </div>
                        <div className="message-bubble system">
                            Start your conversation with {recipient}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="message-input-container">
                    <div className="message-attachments">
                        <button type="button" className="attachment-button">
                            <Image size={20} />
                        </button>
                        <button type="button" className="attachment-button">
                            <Paperclip size={20} />
                        </button>
                        <button type="button" className="attachment-button">
                            <Smile size={20} />
                        </button>
                    </div>
                    <div className="message-input-wrapper">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Message ${recipient}`}
                            rows={1}
                            className="message-input"
                        />
                        <button 
                            type="submit" 
                            className="send-button"
                            disabled={!message.trim()}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MessageModal; 
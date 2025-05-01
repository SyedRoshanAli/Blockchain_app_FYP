import React, { useState, useEffect } from 'react';
import { X, Send, Smile, Image, Paperclip } from 'lucide-react';
import messageService from '../services/messageService';
import { UserAuthContract } from "../UserAuth";
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import './MessageModal.css';

const MessageModal = ({ isOpen, onClose, recipient }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [messageHistory, setMessageHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && recipient) {
            fetchMessageHistory();
        }
    }, [isOpen, recipient]);

    const fetchMessageHistory = async () => {
        try {
            setLoading(true);
            
            // Get recipient's address from username
            const recipientAddress = await UserAuthContract.methods
                .getAddressByUsername(recipient)
                .call();

            // Get message history
            const messages = await messageService.getMessagesWith(recipientAddress);
            
            // Format messages with timestamps
            const formattedMessages = messages.map(msg => ({
                ...msg,
                timestamp: Number(msg.timestamp) * 1000,
                isSender: msg.sender.toLowerCase() === (window.ethereum.selectedAddress || '').toLowerCase()
            }));

            // Sort messages by timestamp
            const sortedMessages = formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            setMessageHistory(sortedMessages);
        } catch (error) {
            console.error('Error fetching message history:', error);
            toast.error('Failed to load message history');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setSending(true);
            
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const currentUserAddress = accounts[0];

            const recipientAddress = await UserAuthContract.methods
                .getAddressByUsername(recipient)
                .call();

            if (currentUserAddress.toLowerCase() === recipientAddress.toLowerCase()) {
                toast.error(`You cannot send a message to yourself`);
                return;
            }

            // Send message
            await messageService.sendMessage(recipientAddress, message.trim());
            
            // Refresh message history
            await fetchMessageHistory();
            
            toast.success(`Message sent to ${recipient}`);
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

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
                        {loading ? (
                            <div className="loading-messages">Loading messages...</div>
                        ) : messageHistory.length === 0 ? (
                            <div className="message-bubble system">
                                Start your conversation with {recipient}
                            </div>
                        ) : (
                            messageHistory.map((msg, index) => (
                                <div 
                                    key={msg.id || index}
                                    className={`message-bubble ${msg.isSender ? 'sent' : 'received'}`}
                                >
                                    <p>{msg.content || msg.message}</p>
                                    <span className="message-time">
                                        {format(new Date(msg.timestamp), 'h:mm a')}
                                    </span>
                                </div>
                            ))
                        )}
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
                            disabled={sending}
                        />
                        <button 
                            type="submit" 
                            className="send-button"
                            disabled={!message.trim() || sending}
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
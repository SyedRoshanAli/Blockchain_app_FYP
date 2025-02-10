import React, { useState } from 'react';
import { X, Send, Smile, Image, Paperclip } from 'lucide-react';
import { messageService } from '../services/messageService';
import { UserAuthContract } from "../UserAuth";
import { toast } from 'react-hot-toast';
import './MessageModal.css';

const MessageModal = ({ isOpen, onClose, recipient }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            setSending(true);
            
            // Get current user's address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const currentUserAddress = accounts[0];

            // Get recipient's address from username
            const recipientAddress = await UserAuthContract.methods
                .getAddressByUsername(recipient)
                .call();

            // Debug logs
            console.log('Current user address:', currentUserAddress);
            console.log('Recipient address:', recipientAddress);
            console.log('Recipient username:', recipient);
            console.log('Are addresses equal?', currentUserAddress.toLowerCase() === recipientAddress.toLowerCase());

            // Check if sending to self
            if (currentUserAddress.toLowerCase() === recipientAddress.toLowerCase()) {
                toast.error(`You are currently logged in as ${recipient}. Please switch accounts to send a message to this user.`);
                setSending(false);
                return;
            }

            console.log('Proceeding to send message:', {
                from: currentUserAddress,
                to: recipientAddress,
                recipient: recipient,
                message: message.trim()
            });

            // Send message using messageService
            await messageService.sendMessage(recipientAddress, message.trim());
            
            toast.success(`Message sent to ${recipient}`);
            setMessage('');
            onClose();
        } catch (error) {
            console.error('Error details:', error);
            if (error.message.includes('Cannot send message to yourself')) {
                toast.error(`You are currently logged in as ${recipient}. Please switch accounts to send a message to this user.`);
            } else {
                toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
            }
        } finally {
            setSending(false);
        }
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
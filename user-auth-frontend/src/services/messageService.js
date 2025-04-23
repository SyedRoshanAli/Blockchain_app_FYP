import { UserAuthContract } from "../UserAuth";
import { toast } from 'react-hot-toast';
import Web3 from 'web3';
import { ethers } from 'ethers';

class MessageService {
    constructor() {
        this.contract = UserAuthContract;
    }

    async getAllMessages() {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            return await this.contract.methods.getMyMessages().call({ from: accounts[0] });
        } catch (error) {
            console.error("Error getting all messages:", error);
            throw error;
        }
    }

    async getMessagesWith(address) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            return await this.contract.methods.getMessagesWith(address).call({ from: accounts[0] });
        } catch (error) {
            console.error("Error getting messages with address:", error);
            throw error;
        }
    }

    async sendMessage(recipientAddress, content) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            // Check if sending to self
            if (accounts[0].toLowerCase() === recipientAddress.toLowerCase()) {
                toast.error("You cannot send a message to yourself");
                throw new Error("Cannot send message to yourself");
            }

            console.log('Sending message details:', {
                from: accounts[0],
                to: recipientAddress,
                content: content
            });

            // Estimate gas first
            const gasEstimate = await this.contract.methods
                .sendMessage(recipientAddress, content)
                .estimateGas({ from: accounts[0] });

            console.log('Estimated gas:', gasEstimate);

            // Add 20% buffer to gas estimate
            const gasLimit = Math.ceil(gasEstimate * 1.2);

            // Get current gas price
            const gasPrice = await window.ethereum.request({
                method: 'eth_gasPrice'
            });

            // Send the transaction with explicit gas configuration
            const result = await this.contract.methods
                .sendMessage(recipientAddress, content)
                .send({ 
                    from: accounts[0],
                    gas: gasLimit,
                    gasPrice: gasPrice
                });

            console.log('Transaction result:', result);
            return true;
        } catch (error) {
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                data: error.data
            });

            if (error.message.includes('Cannot send message to yourself')) {
                toast.error('Cannot send message to yourself');
            } else if (error.code === 4001) {
                toast.error('Transaction rejected by user');
            } else if (error.message.includes('insufficient funds')) {
                toast.error('Insufficient funds for transaction');
            } else if (error.message.includes('execution reverted')) {
                toast.error('Transaction failed: ' + error.message);
            } else {
                toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
            }
            
            throw error;
        }
    }

    async getUnreadCount() {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            return await this.contract.methods.getUnreadMessageCount()
                .call({ from: accounts[0] });
        } catch (error) {
            console.error("Error getting unread count:", error);
            throw error;
        }
    }

    async markAsRead(messageId) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            return await this.contract.methods.markMessageAsRead(messageId)
                .send({ from: accounts[0] });
        } catch (error) {
            console.error("Error marking message as read:", error);
            throw error;
        }
    }

    async onNewMessage(callback) {
        try {
            this.contract.events.MessageSent({})
                .on('data', (event) => {
                    callback(event.returnValues);
                })
                .on('error', console.error);
        } catch (error) {
            console.error("Error setting up message listener:", error);
            throw error;
        }
    }

    async deleteMessage(messageId) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            return await this.contract.methods.deleteMessage(messageId)
                .send({ from: accounts[0] });
        } catch (error) {
            console.error("Error deleting message:", error);
            throw error;
        }
    }
}

export const messageService = new MessageService(); 
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import LandingPage from './LandingPage'; // Landing Page Component
import Register from './Register'; // Register Page Component
import Login from './Login'; // Login Page Component
import Profile from './Profile/Profile'; // Profile Page Component
import CreatePost from './CreatePost/createpost'; // CreatePost Page Component
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
    const [account, setAccount] = useState(''); // Store the connected MetaMask account
    const [web3, setWeb3] = useState(null); // Web3 instance
    const [message, setMessage] = useState(''); // State for error/success messages

    // Function to initialize MetaMask and Web3
    const loadWeb3 = async () => {
        if (window.ethereum) {
            console.log("MetaMask is installed!");

            try {
                // Request MetaMask account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                // Initialize Web3
                const web3Instance = new Web3(window.ethereum);
                setWeb3(web3Instance);

                // Get the user's accounts
                const accounts = await web3Instance.eth.getAccounts();
                if (accounts.length > 0) {
                    setAccount(accounts[0]); // Set the connected account
                    console.log('MetaMask connected, account:', accounts[0]);
                } else {
                    setMessage('No accounts found. Please log in to MetaMask.');
                }

                // Event listener for account changes
                window.ethereum.on('accountsChanged', (newAccounts) => {
                    if (newAccounts.length > 0) {
                        setAccount(newAccounts[0]);
                        setMessage(''); // Clear messages
                        console.log('Account changed:', newAccounts[0]);
                    } else {
                        setAccount('');
                        setMessage('MetaMask account disconnected.');
                    }
                });
            } catch (error) {
                console.error('MetaMask connection error:', error);
                setMessage('MetaMask connection denied. Please allow access to continue.');
            }
        } else {
            console.error('MetaMask not detected!');
            setMessage('MetaMask not detected. Please install it to continue.');
        }
    };

    // Run once when the component mounts
    useEffect(() => {
        loadWeb3();
    }, []);

    return (
        <Router>
            <div className="App">
                {/* Display error or success messages */}
                {message && <p style={{ color: 'red', textAlign: 'center' }}>{message}</p>}

                {/* Application Routes */}
                <Routes>
                    {/* Landing Page (Default) */}
                    <Route path="/" element={<LandingPage account={account} />} />
                    {/* Register Page */}
                    <Route path="/register" element={<Register account={account} web3={web3} />} />
                    {/* Login Page */}
                    <Route path="/login" element={<Login account={account} />} />
                    {/* Profile Page */}
                    <Route path="/profile" element={<Profile account={account} web3={web3} />} />
                    {/* CreatePost Page */}
                    <Route path="/createpost" element={<CreatePost account={account} web3={web3} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;

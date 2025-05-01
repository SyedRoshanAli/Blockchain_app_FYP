import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Button,
    List,
    ListItem,
    ListItemText,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress
} from '@mui/material';
import { styled } from '@mui/system';
import { UserAuthContract } from "./UserAuth";
import { toast } from 'react-hot-toast';
import { Shield, Download, Trash2, Eye, Lock } from 'lucide-react';
import { uploadToIPFS, IPFS_GATEWAY } from './ipfs';

const ControlPanel = styled(Paper)({
    padding: '2rem',
    margin: '2rem 0',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
});

const DataControl = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [privacySettings, setPrivacySettings] = useState({
        profileVisibility: true,
        showEmail: false,
        showPhone: false
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            // Get user session from localStorage
            const userSession = localStorage.getItem('userSession');
            if (!userSession) {
                throw new Error("No active session found");
            }

            // Get user data from localStorage
            const storedData = localStorage.getItem('userData');
            if (!storedData) {
                throw new Error("No user data found");
            }

            const data = JSON.parse(storedData);
            setUserData(data);

            // Set privacy settings if they exist
            if (data.privacySettings) {
                setPrivacySettings(data.privacySettings);
            }

        } catch (error) {
            console.error("Error fetching user data:", error);
            toast.error(error.message || "Failed to fetch user data");
        } finally {
            setLoading(false);
        }
    };

    const handlePrivacyToggle = async (setting) => {
        try {
            const updatedSettings = {
                ...privacySettings,
                [setting]: !privacySettings[setting]
            };

            // Update local state
            setPrivacySettings(updatedSettings);

            // Update userData with new privacy settings
            const updatedUserData = {
                ...userData,
                privacySettings: updatedSettings
            };

            // Save to localStorage
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            setUserData(updatedUserData);
            
            // Get the current user session
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            if (!userSession.username) {
                throw new Error("No active session found");
            }
            
            // Get current user's address
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            // Check if the user is registered on the blockchain
            try {
                // First, verify if the username exists
                const isAvailable = await UserAuthContract.methods
                    .isUsernameAvailable(userSession.username)
                    .call();
                
                // If username is available, it means it's not registered
                if (isAvailable) {
                    // Just update localStorage and don't try to update on blockchain
                    toast.success(`Privacy setting "${setting}" updated to ${updatedSettings[setting] ? 'ON' : 'OFF'} (stored locally)`);
                    return;
                }
                
                // Get the current profile hash from the blockchain
                const profileHash = await UserAuthContract.methods
                    .login(userSession.username)
                    .call({ from: accounts[0] });
                    
                if (!profileHash) {
                    throw new Error("No profile hash found");
                }
                
                // Fetch profile from IPFS or localStorage
                let profileData;
                try {
                    // Try to get from IPFS
                    const response = await fetch(`${IPFS_GATEWAY}/${profileHash}`);
                    if (response.ok) {
                        profileData = await response.json();
                    } else {
                        throw new Error("Failed to fetch from IPFS");
                    }
                } catch (error) {
                    console.warn("Falling back to localStorage for profile data");
                    profileData = { ...userData };
                }
                
                // Update the profile data with new privacy settings
                profileData.privacySettings = updatedSettings;
                
                // Upload updated profile to IPFS
                const newProfileHash = await uploadToIPFS(JSON.stringify(profileData));
                
                // Update the profile hash on blockchain
                await UserAuthContract.methods
                    .updateUser(userSession.username, newProfileHash)
                    .send({ from: accounts[0] });
                
                toast.success(`Privacy setting "${setting}" updated to ${updatedSettings[setting] ? 'ON' : 'OFF'} (saved to blockchain)`);
            } catch (error) {
                console.error("Error updating on blockchain:", error);
                // If blockchain update fails, at least the localStorage update succeeded
                toast.success(`Privacy setting "${setting}" updated to ${updatedSettings[setting] ? 'ON' : 'OFF'} (stored locally only)`);
            }
        } catch (error) {
            console.error("Error updating privacy settings:", error);
            toast.error("Failed to update privacy settings");
        }
    };

    const handleDataDownload = () => {
        try {
            if (!userData) {
                throw new Error("No user data available");
            }

            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `user-data-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success("Data downloaded successfully");
        } catch (error) {
            console.error("Error downloading data:", error);
            toast.error(error.message || "Failed to download data");
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const userSession = JSON.parse(localStorage.getItem('userSession'));
            if (!userSession || !userSession.username) {
                throw new Error("No active session found");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            // Call contract method to reset user
            await UserAuthContract.methods
                .resetUser(userSession.username)
                .send({ from: accounts[0] });

            // Clear all local storage
            localStorage.clear();
            toast.success("Account deleted successfully");
            window.location.href = '/login';
        } catch (error) {
            console.error("Error deleting account:", error);
            toast.error(error.message || "Failed to delete account");
        }
        setShowDeleteDialog(false);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
                Data Control Center
            </Typography>

            <ControlPanel>
                <Typography variant="h6" gutterBottom>
                    <Shield size={20} style={{ marginRight: '8px' }} />
                    Privacy Settings
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText primary="Profile Visibility" />
                        <Switch
                            checked={privacySettings.profileVisibility}
                            onChange={() => handlePrivacyToggle('profileVisibility')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Show Email" />
                        <Switch
                            checked={privacySettings.showEmail}
                            onChange={() => handlePrivacyToggle('showEmail')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Show Phone Number" />
                        <Switch
                            checked={privacySettings.showPhone}
                            onChange={() => handlePrivacyToggle('showPhone')}
                        />
                    </ListItem>
                </List>
            </ControlPanel>

            <ControlPanel>
                <Typography variant="h6" gutterBottom>
                    <Lock size={20} style={{ marginRight: '8px' }} />
                    Data Management
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDataDownload}
                        sx={{ mr: 2 }}
                    >
                        Download My Data
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Trash2 />}
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        Delete Account
                    </Button>
                </Box>
            </ControlPanel>

            <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete your account? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                    <Button onClick={handleDeleteAccount} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default DataControl;
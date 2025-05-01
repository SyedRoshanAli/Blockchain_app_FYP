import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    CssBaseline,
    FormControlLabel,
    Checkbox,
    Link,
    Paper,
    Avatar,
    InputAdornment,
    IconButton,
    Divider,
    Slide,
    Fade,
} from "@mui/material";
import { styled } from "@mui/system";
import { SHA256 } from "crypto-js"; // Import for hashing
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import { UserAuthContract } from "./UserAuth"; // Updated import for UserAuthContract
import { toast } from "react-hot-toast";
import { 
    Login as LoginIcon, 
    Email, 
    Lock, 
    Visibility, 
    VisibilityOff, 
    PersonAdd,
    VpnKey
} from "@mui/icons-material";
import LogoImage from './logo.png'; // Make sure the path is correct for your project structure
import { IPFS_GATEWAY } from './ipfs';

// Styled Components with modern aesthetics
const LoginContainer = styled(Container)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "3rem",
    marginBottom: "4rem",
    padding: "0 1rem",
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2.5rem",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
    background: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
    maxWidth: "450px",
    width: "100%",
    overflow: "hidden",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
        transform: "translateY(-5px)",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
    },
}));

const LoginForm = styled("form")({
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
});

const FormField = styled(Box)({
    width: "100%",
    marginBottom: "1rem",
    transition: "transform 0.2s",
    "&:hover": {
        transform: "translateX(5px)",
    },
});

const StyledAvatar = styled(Avatar)(({ theme }) => ({
    margin: "1rem",
    backgroundColor: "#6366f1",
    width: "64px",
    height: "64px",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
}));

const StyledButton = styled(Button)(({ theme }) => ({
    marginTop: "1.5rem",
    marginBottom: "1rem",
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "1rem",
    background: "linear-gradient(45deg, #4f46e5 0%, #7c3aed 100%)",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
        boxShadow: "0 6px 15px rgba(99, 102, 241, 0.4)",
        transform: "translateY(-3px)",
        background: "linear-gradient(45deg, #4338ca 0%, #6d28d9 100%)",
    },
}));

const Navbar = styled("div")({
    width: "100%",
    height: "70px",
    background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 2rem",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
});

const NavButton = styled(Button)({
    color: "#fff",
    borderRadius: "8px",
    padding: "0.5rem 1.25rem",
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.9rem",
    transition: "transform 0.2s, background-color 0.2s",
    "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        transform: "translateY(-2px)",
    },
});

const LogoTypography = styled(Box)({
    fontWeight: 700,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    fontSize: "1.5rem",
    "& img": {
        width: "50px",
        height: "50px",
        marginRight: "10px",
        borderRadius: "50%",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        border: "2px solid rgba(255, 255, 255, 0.8)",
    },
});

const MessageText = styled(Typography)(({ success }) => ({
    color: success ? '#10b981' : '#ef4444',
    textAlign: 'center',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    marginTop: '1rem',
    width: '100%',
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
        '0%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)'
        },
        '70%': {
            boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)'
        },
        '100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)'
        }
    }
}));

const ForgotPasswordLink = styled(Link)({
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'color 0.2s, transform 0.2s',
    display: 'inline-block',
    '&:hover': {
        color: '#7c3aed',
        transform: 'translateY(-2px)',
        textDecoration: 'none',
    }
});

const CreateAccountLink = styled(Link)({
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    transition: 'color 0.2s, transform 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '1rem',
    '&:hover': {
        color: '#7c3aed',
        transform: 'translateY(-2px)',
        textDecoration: 'none',
    }
});

// Add this new styled component for the large centered logo
const LogoContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "1rem",
    "& img": {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)",
        border: "3px solid #6366f1",
        transition: "transform 0.3s, box-shadow 0.3s",
        "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "0 6px 25px rgba(99, 102, 241, 0.4)",
        },
    },
});

// Login Component
const Login = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState({
        email: false,
        password: false
    });
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("error");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [animate, setAnimate] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setAnimate(true);
        
        // Check if user is already logged in
        const userData = localStorage.getItem('userData');
        const userSession = localStorage.getItem('userSession');
        
        // Check if user is coming from registration page
        const fromRegistration = sessionStorage.getItem('fromRegistration');
        
        if (userData && userSession && !fromRegistration) {
            try {
                // Parse the data to ensure it's valid
                const parsedUserData = JSON.parse(userData);
                const parsedSession = JSON.parse(userSession);
                
                if (parsedUserData.email && parsedSession.address) {
                    // Attempt to auto-login if data is valid
                    navigate("/home");
                }
            } catch (err) {
                console.error("Invalid user data in localStorage:", err);
                // Clear invalid data
                localStorage.removeItem('userData');
                localStorage.removeItem('userSession');
            }
        }
        
        // Clear the fromRegistration flag
        sessionStorage.removeItem('fromRegistration');
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Clear errors when user types
        if (errors[name]) {
            setErrors({...errors, [name]: false});
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    // Save the user's wallet address in userData for easier access
    const saveWalletAddressToUserData = async () => {
        try {
            // Get the current wallet address from MetaMask
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            const address = accounts[0].toLowerCase();
            
            // Update userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData.walletAddress = address;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Also update userSession for redundancy
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            userSession.address = address;
            localStorage.setItem('userSession', JSON.stringify(userSession));
            
            console.log("Login: Saved wallet address to user data:", address);
        } catch (error) {
            console.error("Error saving wallet address:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let hasErrors = false;
        const newErrors = { email: false, password: false };
        
        if (!validateEmail(formData.email)) {
            newErrors.email = true;
            hasErrors = true;
        }
        
        if (!formData.password) {
            newErrors.password = true;
            hasErrors = true;
        }
        
        setErrors(newErrors);
        
        if (hasErrors) {
            setMessage("Please correct the errors in the form");
            setMessageType("error");
            return;
        }
        
        setLoading(true);
        setMessage("");

        try {
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // First try: check in localStorage for registered users
            // This approach bypasses the need for IPFS in local development
            const bypassIPFSForLocalhost = window.location.hostname === 'localhost';
            let foundUser = null;
            
            // Try localStorage first (much faster and works offline)
            try {
                const storedUserData = localStorage.getItem('userData');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    if (userData.email === formData.email) {
                        foundUser = userData;
                        console.log("Found user in localStorage");
                    }
                }
            } catch (error) {
                console.error("Error checking localStorage:", error);
            }
            
            // If not found in localStorage and not on localhost, try IPFS
            if (!foundUser && !bypassIPFSForLocalhost) {
                try {
            // Get all users' IPFS hashes
            const allHashes = await UserAuthContract.methods
                .getAllUserHashes()
                .call();

            // Check each hash for matching email
            for (const hash of allHashes) {
                try {
                            // Use a timeout to prevent long-running requests
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error("IPFS request timeout")), 5000)
                            );
                            
                            const fetchPromise = fetch(`${IPFS_GATEWAY}/${hash}`);
                            
                            // Race between fetch and timeout
                            const response = await Promise.race([fetchPromise, timeoutPromise]);
                            
                    if (!response.ok) continue;
                    
                    const userData = await response.json();
                    if (userData.email === formData.email) {
                        foundUser = userData;
                        break;
                    }
                } catch (error) {
                            console.error(`Error fetching hash ${hash}:`, error);
                    continue;
                }
                    }
                } catch (error) {
                    console.error("Error getting IPFS hashes:", error);
                }
            }
            
            // If still not found and we're in localhost, allow direct login
            if (!foundUser && bypassIPFSForLocalhost) {
                console.log("Development mode: allowing login without IPFS validation");
                
                // Create a mock user for development
                foundUser = {
                    email: formData.email,
                    password: formData.password,  // In dev mode, we'll just compare directly
                    username: formData.email.split('@')[0],  // Use part of email as username
                    address: accounts[0]
                };
            }

            if (!foundUser) {
                throw new Error("Email not found. Please register first.");
            }

            // Verify password
            const passwordMatches = bypassIPFSForLocalhost 
                ? formData.password === foundUser.password 
                : SHA256(formData.password).toString() === SHA256(foundUser.password).toString();
                
            if (passwordMatches) {
                // Store user session
                localStorage.setItem('userData', JSON.stringify(foundUser));
                localStorage.setItem('userSession', JSON.stringify({
                    address: accounts[0],
                    username: foundUser.username
                }));
                
                // If remember me is checked, store that preference
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('rememberMe');
                }

                // Save wallet address to user data
                await saveWalletAddressToUserData();

                toast.success("Login successful!");
                setMessage("Login successful! Redirecting...");
                setMessageType("success");
                
                // Redirect after a short delay to show the success message
                setTimeout(() => {
                navigate("/home");
                }, 1000);
            } else {
                throw new Error("Invalid password");
            }

        } catch (error) {
            console.error("Error during login:", error);
            setMessage(error.message);
            setMessageType("error");
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Email validation
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleResetStorage = () => {
        // Clear all localStorage data
        localStorage.clear();
        toast.success("Local storage has been reset");
        window.location.reload(); // Refresh the page
    };

    return (
        <>
            <CssBaseline />
            <Navbar>
                <LogoTypography>
                    <img src={LogoImage} alt="BlockConnect Logo" />
                    <span style={{ background: 'linear-gradient(45deg, #ffffff, #f0f0f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        BlockConnect
                    </span>
                </LogoTypography>
                <Box>
                    <NavButton 
                        startIcon={<LoginIcon />}
                        href="/login"
                        variant="outlined"
                    >
                        Login
                    </NavButton>
                    <NavButton 
                        startIcon={<PersonAdd />}
                        href="/register" 
                        style={{ marginLeft: "10px" }}
                    >
                        Register
                    </NavButton>
                </Box>
            </Navbar>

            <LoginContainer maxWidth="md">
                <Fade in={animate} timeout={800}>
                    <StyledPaper>
                        <LogoContainer>
                            <img src={LogoImage} alt="BlockConnect Logo" />
                        </LogoContainer>
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Welcome Back
                        </Typography>
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 2, textAlign: 'center' }}>
                            Sign in to access your decentralized social account
                        </Typography>
                        
                        <Divider sx={{ width: '80%', my: 2 }} />
                        
                        <LoginForm onSubmit={handleSubmit} noValidate>
                            <Slide direction="left" in={animate} timeout={600}>
                                <FormField>
                                    <TextField
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        error={errors.email}
                                        helperText={
                                            errors.email
                                                ? "Please enter a valid email address"
                                                : ""
                                        }
                                        label="Email Address"
                                        variant="outlined"
                                        fullWidth
                                        autoFocus
                                        size="medium"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Email color="primary" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormField>
                            </Slide>
                            
                            <Slide direction="right" in={animate} timeout={700}>
                                <FormField>
                                    <TextField
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        error={errors.password}
                                        helperText={
                                            errors.password
                                                ? "Password is required"
                                                : ""
                                        }
                                        label="Password"
                                        variant="outlined"
                                        fullWidth
                                        size="medium"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock color="primary" />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={handleClickShowPassword}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormField>
                            </Slide>
                            
                            <Box display="flex" justifyContent="space-between" width="100%" mt={1} mb={1}>
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            color="primary" 
                                            sx={{ 
                                                '&.Mui-checked': {
                                                    color: '#6366f1',
                                                }
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                            Remember me
                                        </Typography>
                                    }
                                />
                                <ForgotPasswordLink href="#" variant="body2">
                                    Forgot password?
                                </ForgotPasswordLink>
                            </Box>

                            <Fade in={animate} timeout={1000}>
                                <Box sx={{ width: '100%', mt: 2 }}>
                                    <StyledButton
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        disabled={loading}
                                        startIcon={<VpnKey />}
                                    >
                                        {loading ? "Signing In..." : "Sign In"}
                                    </StyledButton>
                                </Box>
                            </Fade>
                            
                            <Fade in={animate} timeout={1200}>
                                <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
                                    <Typography variant="body2" color="textSecondary">
                                        Don't have an account?
                                    </Typography>
                                    <CreateAccountLink href="/register" variant="body2">
                                        <PersonAdd fontSize="small" />
                                        Create an account
                                    </CreateAccountLink>
                                </Box>
                            </Fade>

                            {message && (
                                <Fade in={!!message} timeout={500}>
                                    <MessageText variant="body2" success={messageType === "success"}>
                                        {message}
                                    </MessageText>
                                </Fade>
                            )}
                        </LoginForm>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button 
                                type="button" 
                                onClick={handleResetStorage}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#888', 
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                Reset App Data
                            </button>
                        </div>
                    </StyledPaper>
                </Fade>
            </LoginContainer>
        </>
    );
};

export default Login;

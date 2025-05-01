import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    CssBaseline,
    MenuItem,
    Paper,
    Avatar,
    InputAdornment,
    IconButton,
    Divider,
    Slide,
    Fade,
} from "@mui/material";
import { styled } from "@mui/system";
import { uploadToIPFS } from "./ipfs"; // Ensure IPFS works properly
import { UserAuthContract } from "./UserAuth"; // Import the correct contract reference
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { AccountCircle, Lock, Email, Phone, Cake, Visibility, VisibilityOff, Login, PersonAdd } from "@mui/icons-material";
import LogoImage from './logo.png'; // Make sure the path is correct for your project structure
import { cleanupUserData } from './utils/cleanupStorage';

// Styled components with modern aesthetics
const RegisterContainer = styled(Container)(({ theme }) => ({
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
    padding: "2rem",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
    background: "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
    maxWidth: "480px",
    width: "100%",
    overflow: "hidden",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
        transform: "translateY(-5px)",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
    },
}));

const RegisterForm = styled("form")({
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
});

const FormField = styled(Box)({
    width: "100%",
    marginBottom: "0.75rem",
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

const SecondaryButton = styled(Button)(({ theme }) => ({
    marginTop: "0.5rem",
    marginBottom: "1rem",
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.9rem",
    background: "linear-gradient(45deg, #f87171 0%, #ef4444 100%)",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
        boxShadow: "0 6px 15px rgba(239, 68, 68, 0.3)",
        transform: "translateY(-3px)",
        background: "linear-gradient(45deg, #ef4444 0%, #dc2626 100%)",
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
            boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)'
        },
        '70%': {
            boxShadow: '0 0 0 10px rgba(99, 102, 241, 0)'
        },
        '100%': {
            boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)'
        }
    }
}));

// Add these validation functions at the top of your component
const validateUsername = (username) => {
    // Updated regex to allow spaces between words but require at least one letter
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9\s_]{2,19}$/;
    const containsLetterRegex = /[a-zA-Z]/;
    
    if (!username) return "Username is required";
    
    // Trim spaces from start and end
    const trimmedUsername = username.trim();
    
    // Check if username is too short after trimming
    if (trimmedUsername.length < 3) return "Username must be at least 3 characters";
    
    // Check if username is too long
    if (trimmedUsername.length > 20) return "Username cannot exceed 20 characters";
    
    // Check if username matches basic pattern
    if (!usernameRegex.test(username)) {
        return "Username must start with a letter or number and can contain letters, numbers, spaces, and underscores";
    }
    
    // Check for multiple consecutive spaces
    if (/\s\s/.test(username)) {
        return "Username cannot contain consecutive spaces";
    }
    
    // Check if username contains at least one letter
    if (!containsLetterRegex.test(username)) {
        return "Username must contain at least one letter";
    }
    
    return "";
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
};

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password) return "Password is required";
    if (!passwordRegex.test(password)) {
        return "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character";
    }
    return "";
};

const validatePhoneNumber = (number) => {
    const phoneRegex = /^\d{10}$/;
    if (!number) return "Phone number is required";
    if (!phoneRegex.test(number)) return "Please enter a valid 10-digit phone number";
    return "";
};

const validateDOB = (dob) => {
    if (!dob) return "Date of birth is required";
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) return "You must be at least 13 years old to register";
    if (age > 100) return "Please enter a valid date of birth";
    return "";
};

const validateGender = (gender) => {
    if (!gender) return "Gender is required";
    return "";
};

// Register Component
const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        number: "",
        gender: "",
        dob: "",
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("error");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
    }, []);

    // Handle Input Changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Validate field on change
        let error = "";
        switch (name) {
            case "username":
                error = validateUsername(value);
                break;
            case "email":
                error = validateEmail(value);
                break;
            case "password":
                error = validatePassword(value);
                break;
            case "number":
                error = validatePhoneNumber(value);
                break;
            case "dob":
                error = validateDOB(value);
                break;
            case "gender":
                error = validateGender(value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    // Validate Inputs
    const validateInputs = () => {
        const newErrors = {
            username: validateUsername(formData.username),
            email: validateEmail(formData.email),
            password: validatePassword(formData.password),
            number: validatePhoneNumber(formData.number),
            gender: validateGender(formData.gender),
            dob: validateDOB(formData.dob)
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== "");
    };

    // Handle Password visibility toggle
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    // Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateInputs()) {
            setMessage("Please fill all required fields correctly.");
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

            // Check if username is available
            const isAvailable = await UserAuthContract.methods
                .isUsernameAvailable(formData.username)
                .call();

            if (!isAvailable) {
                throw new Error("Username already taken");
            }

            // Prepare User Data
            const userData = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                number: formData.number,
                gender: formData.gender,
                dob: formData.dob,
                address: accounts[0],
                registrationTime: new Date().toISOString()
            };

            // Upload to IPFS
            const ipfsHash = await uploadToIPFS(JSON.stringify(userData));
            console.log("IPFS Hash:", ipfsHash);

            // Register user on the blockchain with new contract function
            await UserAuthContract.methods
                .register(formData.username, ipfsHash)
                .send({
                    from: accounts[0],
                    gas: 3000000,
                });

            // Store user data in localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userSession', JSON.stringify({
                address: accounts[0],
                username: formData.username
            }));

            toast.success("Account successfully created! You can now log in and access your profile.");
            
            // Reset form after successful registration
            setFormData({
                username: "",
                email: "",
                password: "",
                number: "",
                gender: "",
                dob: "",
            });
            
            // Set success message
            setMessage("Registration successful! You can now log in or register another account.");
            setMessageType("success");

            // Clear any stale localStorage data for this username
            cleanupUserData(formData.username);

            // Set flag in sessionStorage to indicate coming from registration
            sessionStorage.setItem('fromRegistration', 'true');
            
            // Redirect to login page after a short delay
            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            console.error("Registration failed:", error);
            toast.error(error.message);
            setMessage(error.message);
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    // Reset User Data
    const handleReset = async () => {
        setMessage("");
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Get usernames for this address
            const usernames = await UserAuthContract.methods
                .getUsernames(accounts[0])
                .call();

            // Reset each username
            for (const username of usernames) {
                await UserAuthContract.methods
                    .resetUser(username)
                    .send({
                        from: accounts[0],
                        gas: 300000,
                    });
            }

            localStorage.removeItem('userData');
            localStorage.removeItem('userSession');
            setMessage("User data has been reset successfully!");
            setMessageType("success");
            toast.success("Reset successful!");

        } catch (error) {
            console.error("Reset failed:", error);
            toast.error(error.message);
            setMessage(error.message);
            setMessageType("error");
        }
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
                        startIcon={<Login />}
                        href="/login"
                    >
                        Login
                    </NavButton>
                    <NavButton 
                        startIcon={<PersonAdd />}
                        href="/register" 
                        style={{ marginLeft: "10px" }}
                        variant="outlined"
                    >
                        Register
                    </NavButton>
                </Box>
            </Navbar>

            <RegisterContainer maxWidth="md">
                <Fade in={animate} timeout={800}>
                    <StyledPaper>
                        <LogoContainer>
                            <img src={LogoImage} alt="BlockConnect Logo" />
                        </LogoContainer>
                        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Join BlockConnect
                        </Typography>
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                            Create your account on the decentralized social platform
                </Typography>
                        
                        <Divider sx={{ width: '80%', my: 2 }} />
                        
                <RegisterForm onSubmit={handleSubmit} noValidate>
                            <Slide direction="right" in={animate} timeout={500}>
                                <FormField>
                                    <TextField
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        error={Boolean(errors.username)}
                                        helperText={errors.username}
                                        label="Username"
                                        variant="outlined"
                                        fullWidth
                                        size="medium"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <AccountCircle color="primary" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormField>
                            </Slide>
                            
                            <Slide direction="left" in={animate} timeout={600}>
                                <FormField>
                                    <TextField
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        error={Boolean(errors.email)}
                                        helperText={errors.email}
                                        label="Email Address"
                                        variant="outlined"
                                        fullWidth
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
                                        error={Boolean(errors.password)}
                                        helperText={errors.password}
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
                            
                            <Slide direction="left" in={animate} timeout={800}>
                                <FormField>
                                    <TextField
                                        name="number"
                                        value={formData.number}
                                        onChange={handleInputChange}
                                        error={Boolean(errors.number)}
                                        helperText={errors.number}
                                        label="Phone Number"
                                        variant="outlined"
                                        fullWidth
                                        size="medium"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Phone color="primary" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormField>
                            </Slide>
                            
                            <Slide direction="right" in={animate} timeout={900}>
                                <FormField>
                            <TextField
                                        name="dob"
                                        type="date"
                                        value={formData.dob}
                                onChange={handleInputChange}
                                        error={Boolean(errors.dob)}
                                        helperText={errors.dob}
                                        label="Date of Birth"
                                variant="outlined"
                                fullWidth
                                        size="medium"
                                        InputLabelProps={{ shrink: true }}
                                InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Cake color="primary" />
                                                </InputAdornment>
                                            ),
                                    inputProps: {
                                                max: new Date().toISOString().split("T")[0]
                                    }
                                }}
                            />
                                </FormField>
                            </Slide>
                            
                            <Slide direction="left" in={animate} timeout={1000}>
                                <FormField>
                        <TextField
                            name="gender"
                            select
                            value={formData.gender}
                            onChange={handleInputChange}
                            error={Boolean(errors.gender)}
                            helperText={errors.gender}
                                        label="Gender"
                            variant="outlined"
                            fullWidth
                                        size="medium"
                        >
                            <MenuItem value="">Select Gender</MenuItem>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>
                                </FormField>
                            </Slide>

                            <Fade in={animate} timeout={1200}>
                                <Box sx={{ width: '100%', mt: 2 }}>
                                    <StyledButton
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                                        startIcon={<PersonAdd />}
                    >
                                        {loading ? "Creating Account..." : "Create Account"}
                                    </StyledButton>

                                    <SecondaryButton
                        fullWidth
                        variant="contained"
                        onClick={handleReset}
                                    >
                                        Reset User Data
                                    </SecondaryButton>
                                </Box>
                            </Fade>

                    {message && (
                                <Fade in={!!message} timeout={500}>
                                    <MessageText variant="body2" success={messageType === "success"}>
                            {message}
                                    </MessageText>
                                </Fade>
                    )}
                </RegisterForm>
                    </StyledPaper>
                </Fade>
            </RegisterContainer>
        </>
    );
};

export default Register;

import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    CssBaseline,
    MenuItem,
} from "@mui/material";
import { styled } from "@mui/system";
import { uploadToIPFS } from "./ipfs"; // Ensure IPFS works properly
import { UserAuthContract } from "./UserAuth"; // Import the correct contract reference
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Styled Components
const RegisterContainer = styled(Container)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "6rem",
    marginBottom: "4rem",
});

const RegisterForm = styled("form")({
    marginTop: "2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "400px",
});

const Navbar = styled("div")({
    width: "100%",
    height: "60px",
    backgroundColor: "#1976d2",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 1.5rem",
});

const NavButton = styled("a")({
    color: "#fff",
    textDecoration: "none",
    border: "1px solid #fff",
    padding: "5px 10px",
    borderRadius: "5px",
    fontSize: "14px",
});

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
    const [loading, setLoading] = useState(false);

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

    // Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateInputs()) {
            setMessage("Please fill all required fields.");
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
                timestamp: new Date().toISOString()
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

            toast.success("Registration successful! You can now create posts.");
            
            // Reset form after successful registration
            setFormData({
                username: "",
                email: "",
                password: "",
                number: "",
                gender: "",
                dob: "",
            });
            
            // Instead of navigating, just show a success message
            setMessage("Registration successful! You can register another account or proceed to create posts.");

        } catch (error) {
            console.error("Registration failed:", error);
            toast.error(error.message);
            setMessage(error.message);
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
            toast.success("Reset successful!");

        } catch (error) {
            console.error("Reset failed:", error);
            toast.error(error.message);
            setMessage(error.message);
        }
    };

    return (
        <>
            <CssBaseline />
            <Navbar>
                <Typography variant="h6">BlockConnect</Typography>
                <Box>
                    <NavButton href="/login">LOGIN</NavButton>
                    <NavButton href="/register" style={{ marginLeft: "10px" }}>
                        REGISTER
                    </NavButton>
                </Box>
            </Navbar>

            <RegisterContainer maxWidth="sm">
                <Typography component="h1" variant="h5">
                    Register
                </Typography>
                <RegisterForm onSubmit={handleSubmit} noValidate>
                    {["username", "email", "password", "number", "dob"].map((field, idx) => (
                        <Box key={idx} width="100%" marginBottom="1rem">
                            <Typography variant="subtitle1" align="left">
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                            </Typography>
                            <TextField
                                name={field}
                                type={field === "password" ? "password" : field === "dob" ? "date" : "text"}
                                value={formData[field]}
                                onChange={handleInputChange}
                                error={Boolean(errors[field])}
                                helperText={errors[field]}
                                variant="outlined"
                                margin="normal"
                                fullWidth
                                size="small"
                                InputProps={{
                                    inputProps: {
                                        max: field === "dob" ? new Date().toISOString().split("T")[0] : undefined
                                    }
                                }}
                            />
                        </Box>
                    ))}
                    <Box width="100%" marginBottom="1rem">
                        <Typography variant="subtitle1" align="left">
                            Gender
                        </Typography>
                        <TextField
                            name="gender"
                            select
                            value={formData.gender}
                            onChange={handleInputChange}
                            error={Boolean(errors.gender)}
                            helperText={errors.gender}
                            variant="outlined"
                            margin="normal"
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="">Select Gender</MenuItem>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? "Registering..." : "Register"}
                    </Button>

                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleReset}
                        sx={{ mt: 1, mb: 2 }}
                    >
                        Reset User
                    </Button>

                    {message && (
                        <Typography variant="body2" color="textSecondary">
                            {message}
                        </Typography>
                    )}
                </RegisterForm>
            </RegisterContainer>
        </>
    );
};

export default Register;

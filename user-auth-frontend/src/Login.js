import React, { useState } from "react";
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
} from "@mui/material";
import { styled } from "@mui/system";
import { SHA256 } from "crypto-js"; // Import for hashing
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection
import { UserAuthContract } from "./UserAuth"; // Updated import for UserAuthContract

// Styled Components
const LoginContainer = styled(Container)({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "6rem",
    marginBottom: "4rem",
});

const LoginForm = styled("form")({
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

// Login Component
const Login = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Initialize the navigate hook

    // Handle Input Changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            // Ensure MetaMask is installed
            if (!window.ethereum) {
                alert("MetaMask is not installed. Please install MetaMask.");
                setMessage("MetaMask is not installed. Please install MetaMask.");
                return;
            }

            // Connect to MetaMask
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Hash email and password
            const emailHash = SHA256(formData.email).toString();
            const passwordHash = SHA256(formData.password).toString();

            // Fetch user IPFS hash from blockchain
            const userIpfsHash = await UserAuthContract.methods
                .login(formData.email, formData.password)
                .call({ from: accounts[0] });

            if (userIpfsHash) {
                // Fetch user data from IPFS
                const response = await fetch(`http://127.0.0.1:8083/ipfs/${userIpfsHash}`);
                if (!response.ok) {
                    alert("Failed to fetch user data. Please try again.");
                    setMessage("Failed to fetch user data. Please try again.");
                    return;
                }

                const userData = await response.json();
                console.log("Fetched User Data:", userData);

                // Verify hashed credentials
                if (
                    SHA256(userData.email).toString() === emailHash &&
                    SHA256(userData.password).toString() === passwordHash
                ) {
                    alert("Logged in successfully!");
                    setMessage("Logged in successfully!");

                    // Save user data to localStorage for Profile page usage
                    localStorage.setItem("userData", JSON.stringify(userData));

                    // Redirect to Profile page
                    navigate("/profile");
                } else {
                    alert("Invalid email or password. Please try again.");
                    setMessage("Invalid email or password. Please try again.");
                }
            } else {
                alert("User not registered. Please register first.");
                setMessage("User not registered. Please register first.");
            }
        } catch (error) {
            console.error("Error during login:", error);
            setMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
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

            <LoginContainer maxWidth="sm">
                <Typography component="h1" variant="h5">
                    Login
                </Typography>
                <LoginForm onSubmit={handleSubmit} noValidate>
                    <Box width="100%">
                        <Typography variant="subtitle1" gutterBottom>
                            Email Address
                        </Typography>
                        <TextField
                            name="email"
                            size="small"
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            autoFocus
                            value={formData.email}
                            onChange={handleInputChange}
                        />
                    </Box>
                    <Box width="100%">
                        <Typography variant="subtitle1" gutterBottom>
                            Password
                        </Typography>
                        <TextField
                            name="password"
                            size="small"
                            type="password"
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            value={formData.password}
                            onChange={handleInputChange}
                        />
                    </Box>
                    <FormControlLabel
                        control={<Checkbox value="remember" color="primary" />}
                        label="Remember me"
                        sx={{ alignSelf: "flex-start", mt: 1 }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </Button>
                    <Box display="flex" justifyContent="space-between" width="100%">
                        <Link href="#" variant="body2">
                            Forgot password?
                        </Link>
                        <Link href="/register" variant="body2">
                            Create an account
                        </Link>
                    </Box>
                </LoginForm>
            </LoginContainer>
        </>
    );
};

export default Login;

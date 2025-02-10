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
import { toast } from "react-hot-toast";

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
        username: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (!window.ethereum) {
                throw new Error("MetaMask is not installed");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // First check if username exists
            const isAvailable = await UserAuthContract.methods
                .isUsernameAvailable(formData.username)
                .call();

            if (isAvailable) {
                throw new Error("Username not found. Please register first.");
            }

            // Get user's IPFS hash using the login function
            const ipfsHash = await UserAuthContract.methods
                .login(formData.username)
                .call({ from: accounts[0] });

            if (!ipfsHash) {
                throw new Error("Failed to retrieve user data");
            }

            // Fetch user data from IPFS
            const response = await fetch(`http://127.0.0.1:8083/ipfs/${ipfsHash}`);
            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }

            const userData = await response.json();

            // Verify password
            if (SHA256(formData.password).toString() === SHA256(userData.password).toString()) {
                // Store user session
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('userSession', JSON.stringify({
                    address: accounts[0],
                    username: formData.username
                }));

                toast.success("Login successful!");
                navigate("/home");
            } else {
                throw new Error("Invalid password");
            }

        } catch (error) {
            console.error("Error during login:", error);
            // Check for specific contract error messages
            if (error.message.includes("User not registered")) {
                setMessage("This username is not registered with your account");
            } else if (error.message.includes("Unauthorized access")) {
                setMessage("This username belongs to a different account");
            } else {
                setMessage(error.message);
            }
            toast.error(error.message);
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
                            Username
                        </Typography>
                        <TextField
                            name="username"
                            size="small"
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            autoFocus
                            value={formData.username}
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
                    {message && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {message}
                        </Typography>
                    )}
                </LoginForm>
            </LoginContainer>
        </>
    );
};

export default Login;

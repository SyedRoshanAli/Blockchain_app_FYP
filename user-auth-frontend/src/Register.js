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

// Register Component
const Register = () => {
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
        setErrors({ ...errors, [name]: false });
    };

    // Validate Inputs
    const validateInputs = () => {
        const newErrors = {
            username: formData.username.trim() === "",
            email: formData.email.trim() === "",
            password: formData.password.trim() === "",
            number: formData.number.trim() === "",
            gender: formData.gender === "",
            dob: formData.dob === "",
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some((val) => val);
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
            // Ensure MetaMask is installed
            if (!window.ethereum) {
                setMessage("MetaMask is not installed. Please install MetaMask.");
                return;
            }

            // Connect to MetaMask
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            // Check if user is already registered
            try {
                const userIpfsHash = await UserAuthContract.methods
                    .login(formData.email, formData.password)
                    .call({ from: accounts[0] });

                if (userIpfsHash) {
                    setMessage("User already registered! Please log in.");
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.log("User not registered, proceeding with registration.");
            }

            // Prepare User Data
            const userData = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                number: formData.number,
                gender: formData.gender,
                dob: formData.dob,
            };

            // Upload to IPFS
            const ipfsHash = await uploadToIPFS(JSON.stringify(userData));
            console.log("IPFS Hash:", ipfsHash);

            // Register user on the blockchain
            await UserAuthContract.methods
                .register(ipfsHash, formData.email, formData.password)
                .send({
                    from: accounts[0],
                    gas: 3000000,
                });

            setMessage("Registration successful! Data saved to IPFS and Blockchain.");
        } catch (error) {
            console.error("Registration failed:", error);
            setMessage(
                error.message.includes("User already registered")
                    ? "User is already registered. Please log in."
                    : `Registration failed: ${error.message}`
            );
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

            // Reset User Data
            await UserAuthContract.methods.resetUser().send({
                from: accounts[0],
                gas: 300000,
            });

            setMessage("User data has been reset successfully!");
        } catch (error) {
            console.error("Reset failed:", error);
            setMessage(`Reset failed: ${error.message}`);
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
                                error={errors[field]}
                                helperText={errors[field] && `${field} is required`}
                                variant="outlined"
                                margin="normal"
                                fullWidth
                                size="small"
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
                            error={errors.gender}
                            helperText={errors.gender && "Gender is required"}
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

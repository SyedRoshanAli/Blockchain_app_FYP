import React from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  AppBar,
  Toolbar,
} from "@mui/material";
import { Link } from "react-router-dom";

// Import images
import heroImage from "./assets/hero/hero.webp";
import peopleImage from "./assets/hero/people.webp";

const LandingPage = () => {
  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "#fff",
          padding: "2rem",
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for the entire hero section */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 1,
          }}
        ></Box>

        {/* Navbar */}
        <AppBar
          position="absolute"
          sx={{
            top: 0,
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            boxShadow: "none",
            borderBottom: "none",
            zIndex: 3,
          }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ fontSize: "1.5rem", color: "#fff" }}
              >
                BlockConnect
              </Typography>
            </Link>
            <Box>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button
                  color="inherit"
                  sx={{ color: "#fff", fontSize: "1rem", mx: 1 }}
                >
                  Login
                </Button>
              </Link>
              <Link to="/Register" style={{ textDecoration: "none" }}>
                <Button
                  variant="outlined"
                  sx={{
                    color: "#fff",
                    borderColor: "#fff",
                    padding: "0.5rem 1.2rem",
                  }}
                >
                  Register
                </Button>
              </Link>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Hero Content */}
        <Container
          sx={{
            position: "relative",
            zIndex: 2,
            paddingTop: "19vh", // Adjusted to move content upward
            marginBottom: "auto", // Added to create more space below
          }}
        >
          <Typography
            variant="h2"
            fontWeight="bold"
            gutterBottom
            sx={{
              fontSize: { xs: "3rem", md: "4rem" },
              lineHeight: 1.2,
            }}
          >
            Welcome to BlockConnect
          </Typography>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontSize: { L: "1rem", md: "1.1rem" },
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            A Decentralized Platform Connecting the World with Freedom and
            Privacy.
          </Typography>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              size="large"
              sx={{
                backgroundColor: "#ff4081",
                ":hover": { backgroundColor: "#f50057" },
                mt: 3,
                fontSize: { xs: "1.2rem", md: "1rem" },
                padding: "1rem 2rem",
              }}
            >
              Get Started
            </Button>
          </Link>
        </Container>
      </Box>

      {/* Other Sections (Features, Call to Action, Footer, etc.) */}
      {/* These sections remain the same */}

      <Container sx={{ py: 6 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          gutterBottom
          sx={{ fontSize: { xs: "1.8rem", md: "2.5rem" } }}
        >
          Why Choose BlockConnect?
        </Typography>
        <Grid container spacing={4} mt={4}>
          {[
            {
              title: "Decentralized Network",
              description:
                "Powered by blockchain technology, ensuring no central authority controls your data.",
            },
            {
              title: "Enhanced Privacy",
              description:
                "Your information stays yours, with advanced cryptographic techniques protecting it.",
            },
            {
              title: "Global Community",
              description:
                "Connect with users worldwide in an open and censorship-free environment.",
            },
          ].map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Box
                sx={{
                  textAlign: "center",
                  padding: "2rem",
                  borderRadius: "10px",
                  backgroundColor: "#f5f5f5",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.05)" },
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" } }}
                >
                  {feature.title}
                </Typography>
                <Typography mt={1} sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box
        sx={{
          textAlign: "center",
          color: "#fff",
          py: 6,
          px: 2,
          backgroundImage: `url(${peopleImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          "::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 1,
          },
          "> *": { position: "relative", zIndex: 2 },
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: { xs: "1.8rem", md: "2.5rem" } }}
        >
          Ready to Join the Revolution?
        </Typography>
        <Link to="/Register" style={{ textDecoration: "none" }}>
          <Button
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              backgroundColor: "#ff4081",
              ":hover": { backgroundColor: "#f50057" },
            }}
          >
            Register Now
          </Button>
        </Link>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 3, textAlign: "center", backgroundColor: "#f5f5f5" }}>
        <Typography variant="body2" color="textSecondary">
          © 2024 BlockConnect. All Rights Reserved.
        </Typography>
      </Box>
    </>
  );
};

export default LandingPage;

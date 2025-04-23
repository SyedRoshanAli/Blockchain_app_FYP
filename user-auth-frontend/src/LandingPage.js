import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Fade,
  Slide,
  Zoom,
  useScrollTrigger,
  Divider,
  IconButton,
} from "@mui/material";
import { Link } from "react-router-dom";
import { styled } from "@mui/system";
import { 
  Security, 
  Language, 
  Visibility, 
  Speed, 
  AccountBalanceWallet,
  GitHub,
  LinkedIn,
  Twitter
} from "@mui/icons-material";

// Import images
import heroImage from "./assets/hero/hero.webp";
import peopleImage from "./assets/hero/people.webp";
import LogoImage from './logo.png';

// Custom styled components
const GradientButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)',
  color: 'white',
  padding: '12px 32px',
  borderRadius: '30px',
  boxShadow: '0 3px 15px rgba(107, 114, 251, 0.3)',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '1rem',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 5px 20px rgba(107, 114, 251, 0.5)',
    transform: 'translateY(-3px)',
  },
}));

const OutlinedGradientButton = styled(Button)(({ theme }) => ({
  background: 'transparent',
  border: '2px solid #8B5CF6',
  color: 'white',
  padding: '10px 30px',
  borderRadius: '30px',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '0.95rem',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(139, 92, 246, 0.1)',
    transform: 'translateY(-2px)',
  },
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
  height: '100%',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  background: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
  },
}));

const FeatureIconBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '70px',
  height: '70px',
  margin: '0 auto 16px',
  borderRadius: '50%',
  background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)',
  boxShadow: '0 5px 15px rgba(107, 114, 251, 0.3)',
  color: 'white',
  '& svg': {
    fontSize: '30px',
  },
}));

const LogoContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  "& img": {
    width: "42px",
    height: "42px",
    marginRight: "10px",
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
    border: "2px solid rgba(255, 255, 255, 0.8)",
  },
});

const StatBox = styled(Box)(({ theme }) => ({
  padding: '24px',
  textAlign: 'center',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: 'white',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
}));

const SocialButton = styled(IconButton)(({ theme }) => ({
  color: '#6366F1',
  background: 'white',
  margin: '0 8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: '#6366F1',
    color: 'white',
    transform: 'translateY(-3px)',
  },
}));

// Fade-in component for animation on scroll
function FadeInSection({ children, direction = 'up', timeout = 1000, threshold = 0.1 }) {
  const [isVisible, setVisible] = useState(false);
  const domRef = React.useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => setVisible(entry.isIntersecting));
      },
      { threshold }
    );
    
    const { current } = domRef;
    observer.observe(current);
    
    return () => observer.unobserve(current);
  }, [threshold]);

  return (
    <div ref={domRef}>
      <Fade in={isVisible} timeout={timeout} style={{ transitionDelay: '100ms' }}>
        <Slide direction={direction} in={isVisible} timeout={timeout+200}>
          {children}
        </Slide>
      </Fade>
    </div>
  );
}

// Main Landing Page Component
const LandingPage = () => {
  const [animateHero, setAnimateHero] = useState(false);
  
  useEffect(() => {
    setAnimateHero(true);
  }, []);
  
  // For navbar color change on scroll
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  // Stats data
  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "250K+", label: "Transactions" },
    { number: "100%", label: "Decentralized" },
  ];

  // Features data
  const features = [
    {
      title: "Blockchain Powered",
      description: "Fully decentralized infrastructure ensuring your data remains yours and cannot be censored or controlled by centralized authorities.",
      icon: <AccountBalanceWallet />,
    },
    {
      title: "Enhanced Privacy",
      description: "Advanced cryptographic techniques protect your personal information, giving you full control over what you share and with whom.",
      icon: <Security />,
    },
    {
      title: "Lightning Fast",
      description: "Optimized architecture and smart contracts deliver a responsive user experience without compromising on security or decentralization.",
      icon: <Speed />,
    },
    {
      title: "Global Community",
      description: "Connect with users worldwide in an open, borderless, and censorship-resistant social environment.",
      icon: <Language />,
    },
    {
      title: "Complete Transparency",
      description: "All platform operations are visible on the blockchain, ensuring accountability and preventing misuse of user data.",
      icon: <Visibility />,
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          overflow: "hidden",
          background: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.7)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Navbar */}
        <AppBar
          position="fixed"
          elevation={trigger ? 4 : 0}
          sx={{
            backgroundColor: trigger ? 'rgba(26, 32, 44, 0.95)' : 'transparent',
            transition: 'all 0.3s ease',
            backdropFilter: trigger ? 'blur(10px)' : 'none',
            borderBottom: trigger ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          }}
        >
          <Toolbar sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            padding: { xs: '0.5rem 1rem', md: '0.5rem 2rem' } 
          }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <LogoContainer>
                <img src={LogoImage} alt="BlockConnect Logo" />
              <Typography
                variant="h6"
                fontWeight="bold"
                  sx={{ 
                    color: "#fff", 
                    background: 'linear-gradient(to right, #fff, #b8b8b8)', 
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
              >
                BlockConnect
              </Typography>
              </LogoContainer>
            </Link>
            <Box>
              <Link to="/login" style={{ textDecoration: "none", marginRight: '16px' }}>
                <OutlinedGradientButton>
                  Login
                </OutlinedGradientButton>
              </Link>
              <Link to="/Register" style={{ textDecoration: "none" }}>
                <GradientButton>
                  Register
                </GradientButton>
              </Link>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Hero Content */}
        <Container
          sx={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: { xs: '0 1rem', md: '0 2rem' },
            marginTop: '6rem',
          }}
          maxWidth="lg"
        >
          <Fade in={animateHero} timeout={1000}>
          <Typography
            variant="h2"
            fontWeight="bold"
            sx={{
                fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" },
              lineHeight: 1.2,
                marginBottom: '1.5rem',
                background: 'linear-gradient(45deg, #fff 30%, #c7d2fe 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            }}
          >
              The Future of <br />Social Networking
          </Typography>
          </Fade>

          <Fade in={animateHero} timeout={1500} style={{ transitionDelay: '300ms' }}>
          <Typography
            variant="h5"
            sx={{
                fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                maxWidth: "700px",
                margin: '0 auto 2rem',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.6,
              }}
            >
              A decentralized social platform that puts your privacy first. Connect with others without sacrificing your data or freedom.
          </Typography>
          </Fade>

          <Fade in={animateHero} timeout={2000} style={{ transitionDelay: '600ms' }}>
            <Box>
              <Link to="/Register" style={{ textDecoration: "none" }}>
                <GradientButton
              size="large"
              sx={{
                    fontSize: { xs: "1rem", md: "1.1rem" },
                    padding: "14px 36px",
                    marginRight: '16px',
              }}
            >
              Get Started
                </GradientButton>
              </Link>
              <Link to="#features" style={{ textDecoration: "none" }}>
                <OutlinedGradientButton
                  size="large"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.1rem" },
                  }}
                >
                  Learn More
                </OutlinedGradientButton>
          </Link>
            </Box>
          </Fade>

          {/* Stats Section */}
          <Fade in={animateHero} timeout={2500} style={{ transitionDelay: '900ms' }}>
            <Grid container spacing={3} sx={{ mt: 6, maxWidth: "900px" }}>
              {stats.map((stat, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <StatBox>
                    <Typography 
                      variant="h3" 
                      fontWeight="bold"
                      sx={{ 
                        fontSize: { xs: "2rem", md: "2.5rem" },
                        background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1
                      }}
                    >
                      {stat.number}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.8 }}>
                      {stat.label}
                    </Typography>
                  </StatBox>
                </Grid>
              ))}
            </Grid>
          </Fade>
        </Container>

        {/* Scroll Indicator */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: '30px', 
            left: 'calc(50% - 15px)',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
              '40%': { transform: 'translateY(-20px)' },
              '60%': { transform: 'translateY(-10px)' }
            }
          }}
        >
          <Box 
            sx={{ 
              width: '30px', 
              height: '50px', 
              border: '2px solid white', 
              borderRadius: '15px',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '8px',
                height: '8px',
                background: 'white',
                left: '50%',
                top: '8px',
                transform: 'translateX(-50%)',
                borderRadius: '50%',
                animation: 'scroll 2s infinite',
              },
              '@keyframes scroll': {
                '0%': { top: '8px', opacity: 1 },
                '100%': { top: '32px', opacity: 0 },
              }
            }} 
          />
        </Box>
      </Box>

      {/* Features Section */}
      <Box id="features" sx={{ py: 10, background: '#f9faff' }}>
        <Container maxWidth="lg">
          <FadeInSection>
            <Box textAlign="center" mb={8}>
        <Typography
                variant="h6"
                sx={{
                  color: '#6366F1',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  mb: 2
                }}
              >
                Why Choose BlockConnect
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mb: 2 }}
              >
                The Power of Decentralization
              </Typography>
              <Divider sx={{ width: '80px', margin: '0 auto', height: '4px', background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)', borderRadius: '2px', mb: 3 }} />
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ maxWidth: '800px', mx: 'auto', fontSize: '1.1rem' }}
              >
                Experience the next generation of social networking, where your data is truly yours and your privacy is guaranteed.
              </Typography>
            </Box>
          </FadeInSection>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={index < 2 ? 6 : 4} key={index}>
                <FadeInSection direction={index % 2 === 0 ? 'right' : 'left'} timeout={800 + index * 200}>
                  <FeatureCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <FeatureIconBox>
                        {feature.icon}
                      </FeatureIconBox>
                <Typography
                        variant="h5"
                  fontWeight="bold"
                        sx={{ mb: 2 }}
                >
                  {feature.title}
                </Typography>
                      <Typography variant="body1" color="textSecondary">
                  {feature.description}
                </Typography>
                    </CardContent>
                  </FeatureCard>
                </FadeInSection>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>

      {/* Call to Action */}
      <Box
        sx={{
          position: 'relative',
          py: 10,
          background: `linear-gradient(rgba(26, 32, 44, 0.95), rgba(26, 32, 44, 0.9)), url(${peopleImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          color: 'white',
        }}
      >
        <Container maxWidth="md">
          <FadeInSection>
            <Box textAlign="center">
        <Typography
                variant="h3"
          fontWeight="bold"
                sx={{ 
                  fontSize: { xs: "2rem", md: "3rem" }, 
                  mb: 3,
                  background: 'linear-gradient(45deg, #fff 30%, #c7d2fe 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
        >
          Ready to Join the Revolution?
        </Typography>
              <Typography
                variant="h6"
                sx={{ 
                  mb: 4, 
                  maxWidth: '800px', 
                  mx: 'auto',
                  color: 'rgba(255, 255, 255, 0.8)',
                  lineHeight: 1.6
                }}
              >
                Take control of your online social experience today. Join thousands of users who have already made the switch to a truly decentralized platform.
        </Typography>
        <Link to="/Register" style={{ textDecoration: "none" }}>
                <GradientButton
            size="large"
            sx={{
                    fontSize: "1.1rem", 
                    padding: "16px 40px", 
                    boxShadow: '0 5px 20px rgba(107, 114, 251, 0.5)' 
                  }}
                >
                  Create Your Account
                </GradientButton>
        </Link>
            </Box>
          </FadeInSection>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, backgroundColor: "#131a29", color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <LogoContainer sx={{ mb: 2 }}>
                <img src={LogoImage} alt="BlockConnect Logo" />
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ 
                    color: "#fff", 
                    background: 'linear-gradient(to right, #fff, #b8b8b8)', 
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  BlockConnect
                </Typography>
              </LogoContainer>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2, maxWidth: '300px' }}>
                A decentralized social platform built on blockchain technology, ensuring your privacy and data ownership.
              </Typography>
              <Box>
                <SocialButton aria-label="github">
                  <GitHub />
                </SocialButton>
                <SocialButton aria-label="linkedin">
                  <LinkedIn />
                </SocialButton>
                <SocialButton aria-label="twitter">
                  <Twitter />
                </SocialButton>
              </Box>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Platform
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                How it works
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Features
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Security
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Developers
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Company
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                About Us
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Careers
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Blog
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1 }}>
                Contact
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Subscribe
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
                Stay updated with our latest features and releases
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <input 
                  type="email"
                  placeholder="Enter your email"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '30px 0 0 30px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
                <Button 
                  sx={{
                    background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)',
                    color: 'white',
                    borderRadius: '0 30px 30px 0',
                    padding: '10px 20px',
                    boxShadow: 'none',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5153c3 30%, #7b4edb 90%)',
                    }
                  }}
                >
                  Subscribe
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              © 2024 BlockConnect. All rights reserved.
            </Typography>
            <Box sx={{ mt: { xs: 2, sm: 0 } }}>
              <Link to="#" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'inline', mr: 3 }}>
                  Privacy Policy
                </Typography>
              </Link>
              <Link to="#" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'inline' }}>
                  Terms of Service
        </Typography>
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default LandingPage;

#!/usr/bin/env node

/**
 * Deployment Checker Script
 * This script checks if your project is ready for deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting deployment readiness check...');

// Function to check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Function to run a command and return output
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.stdout?.toString() || error.message);
    return null;
  }
}

// Check environment file
function checkEnvFile() {
  console.log('\nChecking .env file...');
  
  if (!fileExists('.env')) {
    console.error('❌ .env file not found. Please create it with your wallet mnemonic and project ID.');
    return false;
  }
  
  const envContent = fs.readFileSync('.env', 'utf8');
  if (!envContent.includes('MNEMONIC=') || !envContent.includes('PROJECT_ID=')) {
    console.error('❌ .env file is missing MNEMONIC or PROJECT_ID.');
    return false;
  }
  
  // Check if values are placeholders
  if (envContent.includes('your wallet mnemonic') || envContent.includes('your infura or alchemy')) {
    console.warn('⚠️ .env file contains placeholder values. Make sure to update them before deployment.');
    return false;
  }
  
  console.log('✅ .env file looks good.');
  return true;
}

// Check smart contracts
function checkSmartContracts() {
  console.log('\nChecking smart contracts...');
  
  // Check if contracts exist
  const contractsDir = path.join(__dirname, 'contracts');
  if (!fileExists(contractsDir)) {
    console.error('❌ contracts directory not found.');
    return false;
  }
  
  const contracts = fs.readdirSync(contractsDir).filter(file => file.endsWith('.sol'));
  if (contracts.length === 0) {
    console.error('❌ No Solidity contracts found in contracts directory.');
    return false;
  }
  
  console.log(`✅ Found ${contracts.length} smart contracts.`);
  
  // Try compiling contracts
  console.log('Compiling smart contracts...');
  const compileOutput = runCommand('npx truffle compile');
  
  if (!compileOutput) {
    console.error('❌ Failed to compile smart contracts.');
    return false;
  }
  
  if (compileOutput.includes('Error')) {
    console.error('❌ Compilation errors found:');
    console.error(compileOutput);
    return false;
  }
  
  console.log('✅ Smart contracts compile successfully.');
  return true;
}

// Check frontend
function checkFrontend() {
  console.log('\nChecking frontend...');
  
  const frontendDir = path.join(__dirname, 'user-auth-frontend');
  if (!fileExists(frontendDir)) {
    console.error('❌ user-auth-frontend directory not found.');
    return false;
  }
  
  const packageJsonPath = path.join(frontendDir, 'package.json');
  if (!fileExists(packageJsonPath)) {
    console.error('❌ Frontend package.json not found.');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if homepage is set
    if (!packageJson.homepage) {
      console.warn('⚠️ Homepage not set in package.json. This might cause routing issues in production.');
    } else {
      console.log(`✅ Homepage set to: ${packageJson.homepage}`);
    }
    
    // Check deployment script
    const deployScriptPath = path.join(frontendDir, 'deploy.sh');
    if (!fileExists(deployScriptPath)) {
      console.warn('⚠️ deploy.sh script not found in user-auth-frontend directory.');
    } else {
      const scriptIsExecutable = (fs.statSync(deployScriptPath).mode & 0o111) !== 0;
      if (!scriptIsExecutable) {
        console.warn('⚠️ deploy.sh script is not executable. Run: chmod +x user-auth-frontend/deploy.sh');
      } else {
        console.log('✅ deploy.sh script is executable.');
      }
    }
    
    console.log('✅ Frontend checks completed.');
    return true;
  } catch (error) {
    console.error('❌ Error checking frontend:', error.message);
    return false;
  }
}

// Check if truffle-config.js is properly configured
function checkTruffleConfig() {
  console.log('\nChecking truffle-config.js...');
  
  if (!fileExists('truffle-config.js')) {
    console.error('❌ truffle-config.js not found.');
    return false;
  }
  
  const configContent = fs.readFileSync('truffle-config.js', 'utf8');
  
  if (!configContent.includes('require(\'dotenv\').config()')) {
    console.warn('⚠️ truffle-config.js might not be loading environment variables from .env file.');
  }
  
  if (!configContent.includes('HDWalletProvider')) {
    console.error('❌ HDWalletProvider not configured in truffle-config.js.');
    return false;
  }
  
  if (!configContent.includes('sepolia')) {
    console.warn('⚠️ Sepolia testnet not configured in truffle-config.js.');
  }
  
  console.log('✅ truffle-config.js looks good.');
  return true;
}

// Main function
function main() {
  console.log('===========================================');
  console.log('   BLOCKCHAIN APP DEPLOYMENT READINESS     ');
  console.log('===========================================');
  
  const envCheck = checkEnvFile();
  const contractsCheck = checkSmartContracts();
  const frontendCheck = checkFrontend();
  const truffleConfigCheck = checkTruffleConfig();
  
  console.log('\n===========================================');
  console.log('           DEPLOYMENT SUMMARY              ');
  console.log('===========================================');
  console.log(`Environment: ${envCheck ? '✅' : '❌'}`);
  console.log(`Smart Contracts: ${contractsCheck ? '✅' : '❌'}`);
  console.log(`Frontend: ${frontendCheck ? '✅' : '❌'}`);
  console.log(`Truffle Config: ${truffleConfigCheck ? '✅' : '❌'}`);
  
  if (envCheck && contractsCheck && frontendCheck && truffleConfigCheck) {
    console.log('\n✅ Your project is ready for deployment!');
    console.log('\nNext steps:');
    console.log('1. Deploy smart contracts: npx truffle migrate --network sepolia');
    console.log('2. Update contract addresses in user-auth-frontend/src/UserAuth.js');
    console.log('3. Deploy frontend: cd user-auth-frontend && ./deploy.sh');
  } else {
    console.log('\n⚠️ Your project needs attention before deployment. Fix the issues mentioned above.');
  }
}

// Run the main function
main(); 
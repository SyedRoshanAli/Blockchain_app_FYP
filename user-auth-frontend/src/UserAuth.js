import Web3 from "web3";
import UserAuthABI from "./artifacts/UserAuth.json"; // Path to UserAuth ABI
import CreatePostABI from "./artifacts/CreatePost.json"; // Path to CreatePost ABI

// Deployed contract addresses
const userAuthAddress = "0x78B8bF5242e9Aea06c10CEf1d92D0c6a2AeD9F09"; // UserAuth address
const createPostAddress = "0xC88e18a71Cb543a9945B96341fDfCF5cF298293f"; // CreatePost address

// Web3 setup
const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");

// Updated contract interface to match new contract functions
const UserAuthContract = new web3.eth.Contract([
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_username",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_ipfsHash",
                "type": "string"
            }
        ],
        "name": "register",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_username",
                "type": "string"
            }
        ],
        "name": "login",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_userAddress",
                "type": "address"
            }
        ],
        "name": "getUsernames",
        "outputs": [
            {
                "internalType": "string[]",
                "name": "",
                "type": "string[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_username",
                "type": "string"
            }
        ],
        "name": "isUsernameAvailable",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
], userAuthAddress);
const CreatePostContract = new web3.eth.Contract(CreatePostABI.abi, createPostAddress);

export { UserAuthContract, CreatePostContract };

import Web3 from "web3";
import UserAuthABI from "./artifacts/UserAuth.json"; // Path to UserAuth ABI
import CreatePostABI from "./artifacts/CreatePost.json"; // Path to CreatePost ABI

// Deployed contract addresses
const userAuthAddress = "0x8A3F243F13d4A7E1d7d015C9959E5ECd45302476"; // UserAuth address
const createPostAddress = "0xD7E3e61D3131A19D543C472eBccFbDc54da2985d"; // CreatePost address

// Web3 setup
const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");

// Contract instances
const UserAuthContract = new web3.eth.Contract(UserAuthABI.abi, userAuthAddress);
const CreatePostContract = new web3.eth.Contract(CreatePostABI.abi, createPostAddress);

export { UserAuthContract, CreatePostContract };

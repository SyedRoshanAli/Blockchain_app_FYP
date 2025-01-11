import Web3 from "web3";
import UserAuthABI from "./artifacts/UserAuth.json"; // Path to your ABI file

const contractAddress = "0x99Cb67Fa7093024CD239689b9e9e0A3039671228"; // Replace with actual deployed address
const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");
const UserAuthContract = new web3.eth.Contract(UserAuthABI.abi, contractAddress);

export default UserAuthContract;

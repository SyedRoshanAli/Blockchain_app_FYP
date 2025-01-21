import Web3 from "web3";
import UserAuthABI from "./artifacts/UserAuth.json"; // Path to your ABI file

const contractAddress = "0x78286b99c5D3341f551a3F04360FBAB0cA90e1e4"; // Replace with actual deployed address
const web3 = new Web3(Web3.givenProvider || "http://localhost:7545");
const UserAuthContract = new web3.eth.Contract(UserAuthABI.abi, contractAddress);

export default UserAuthContract;

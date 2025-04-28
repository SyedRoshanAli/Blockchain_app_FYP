import "./index.css";
import React, { useState, useEffect } from "react";
import "./Profile.css";
import { useNavigate } from "react-router-dom"; // For redirection
import { UserAuthContract, CreatePostContract } from "../UserAuth"; // Import CreatePostContract
import { IPFS_GATEWAY } from '../ipfs';

const ProfilePage = () => {
    const tabs = ["Tweets", "Tweets & Replies", "Media", "Likes", "Lists"];

    const [activeTab, setActiveTab] = useState("Tweets");

    const [userData, setUserData] = useState(null);
    const [posts, setPosts] = useState([]); // State to hold user posts
  
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate(); // Initialize navigation

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            setErrorMessage("");

            try {
                if (!window.ethereum) {
                    setErrorMessage("MetaMask is not installed. Please install MetaMask.");
                    return;
                }

                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });

                // Fetch user IPFS hash from blockchain
                const userIpfsHash = await UserAuthContract.methods.login().call({
                    from: accounts[0],
                });

                if (!userIpfsHash) {
                    throw new Error("User data not found on blockchain.");
                }

                // Fetch user data from IPFS
                const response = await fetch(`${IPFS_GATEWAY}/${userIpfsHash}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch user data from IPFS.");
                }

                const data = await response.json();

                // Fetch posts from blockchain
                const postIds = await CreatePostContract.methods
                    .getPostsByUser(accounts[0])
                    .call();

                // Map postIds to fetch post details from blockchain and IPFS
                const fetchedPosts = await Promise.all(
                    postIds.map(async (postId) => {
                        const post = await CreatePostContract.methods.getPost(postId.toString()).call();
                        const postDataResponse = await fetch(`${IPFS_GATEWAY}/${post.contentHash}`);
                        const postData = await postDataResponse.json(); // Parse the JSON content from IPFS

                        return {
                            id: post.postId.toString(),
                            title: postData.title,
                            description: postData.description,
                            image: `${IPFS_GATEWAY}/${postData.image}`,
                            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
                        };
                    })
                );

                setUserData(data);
                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Error fetching user data:", error);
                setErrorMessage(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (loading) {
        return <div className="soft-ui-container">Loading profile...</div>;
    }

    if (errorMessage) {
        return <div className="soft-ui-container">{errorMessage}</div>;
    }

  return (

    <div
      class="relative flex size-full min-h-screen flex-col bg-slate-50 group/design-root overflow-x-hidden"
      style={{ fontFamily: "Plus Jakarta Sans Noto Sans sans-serif" }}
    >
      <div class="layout-container flex h-full grow flex-col">
        <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7eef3] px-10 py-3">
          <div class="flex items-center gap-4 text-[#0d161c]">
            <div class="size-4">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
                  fill="currentColor"
                ></path>
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <h2 class="text-[#0d161c] text-lg font-bold leading-tight tracking-[-0.015em]">
              Chirp
            </h2>
          </div>
          <div className="flex border-b border-[#cfdee8] px-4 gap-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 text-sm font-bold leading-normal tracking-[0.015em] transition-all ${
              activeTab === tab
                ? "border-b-[#26a0f2] text-[#0d161c]"
                : "border-b-transparent text-[#4b7b9b]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
        </header>
        <div class="px-40 flex flex-1 justify-center py-5">
          <div class="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div class="@container">
              <div class="@[480px]:px-4 @[480px]:py-3">
                <div
                  class="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-50 @[480px]:rounded-xl min-h-[218px]"
                  style={{
                    backgroundImage:
                      "url('https://cdn.usegalileo.ai/sdxl10/4459c9a2-69e5-4aea-9a7f-a2873ce52939.png')",
                  }}
                ></div>
              </div>
            </div>
            <div class="flex p-4 @container">
              <div class="flex w-full flex-col gap-4 @[520px]:flex-row @[520px]:justify-between @[520px]:items-center">
                <div class="flex gap-4">
                  <div
                    class="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32"
                    style={{
                      backgroundImage:
                        "url('https://cdn.usegalileo.ai/sdxl10/4459c9a2-69e5-4aea-9a7f-a2873ce52939.png')",
                    }}
                  ></div>
                  <div class="flex flex-col justify-center">
                    <p class="text-[#0d161c] text-[22px] font-bold leading-tight tracking-[-0.015em]">
                    {userData?.email || "No Email"}
                    </p>
                    <p class="text-[#4b7b9b] text-base font-normal leading-normal">
                    {userData?.email || "No Email"}
                    </p>
                    <p class="text-[#4b7b9b] text-base font-normal leading-normal">
                      Product designer at Chirp. Currently working on the
                      Explore Page.
                    </p>
                  </div>
                </div>
                <button class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#e7eef3] text-[#0d161c] text-sm font-bold leading-normal tracking-[0.015em] w-full max-w-[480px] @[480px]:w-auto">
                  <span class="truncate">Edit Profile</span>
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-3 px-4 py-3">
              <div class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-lg border border-[#cfdee8] p-3 items-center text-center">
                <p class="text-[#0d161c] tracking-light text-2xl font-bold leading-tight">
                  113
                </p>
                <div class="flex items-center gap-2">
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    Following
                  </p>
                </div>
              </div>
              <div class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-lg border border-[#cfdee8] p-3 items-center text-center">
                <p class="text-[#0d161c] tracking-light text-2xl font-bold leading-tight">
                  1,324
                </p>
                <div class="flex items-center gap-2">
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    Followers
                  </p>
                </div>
              </div>
              <div class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-lg border border-[#cfdee8] p-3 items-center text-center">
                <p class="text-[#0d161c] tracking-light text-2xl font-bold leading-tight">
                  2,500
                </p>
                <div class="flex items-center gap-2">
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    Likes
                  </p>
                </div>
              </div>
            </div>
            <div class="pb-3">
              <div class="flex border-b border-[#cfdee8] px-4 gap-8">
                <a
                  class="flex flex-col items-center justify-center border-b-[3px] border-b-[#26a0f2] text-[#0d161c] pb-[13px] pt-4"
                  href="#"
                >
                  <p class="text-[#0d161c] text-sm font-bold leading-normal tracking-[0.015em]">
                    Tweets
                  </p>
                </a>
                <a
                  class="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4b7b9b] pb-[13px] pt-4"
                  href="#"
                >
                  <p class="text-[#4b7b9b] text-sm font-bold leading-normal tracking-[0.015em]">
                    Tweets &amp; Replies
                  </p>
                </a>
                <a
                  class="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4b7b9b] pb-[13px] pt-4"
                  href="#"
                >
                  <p class="text-[#4b7b9b] text-sm font-bold leading-normal tracking-[0.015em]">
                    Media
                  </p>
                </a>
                <a
                  class="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4b7b9b] pb-[13px] pt-4"
                  href="#"
                >
                  <p class="text-[#4b7b9b] text-sm font-bold leading-normal tracking-[0.015em]">
                    Likes
                  </p>
                </a>
                <a
                  class="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#4b7b9b] pb-[13px] pt-4"
                  href="#"
                >
                  <p class="text-[#4b7b9b] text-sm font-bold leading-normal tracking-[0.015em]">
                    Lists
                  </p>
                </a>
              </div>
            </div>

            {activeTab === "Tweets" &&    <div class="flex gap-4 bg-slate-50 px-4 py-3 justify-between">
              <div class="flex items-start gap-4">
                <div
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-[70px] w-fit"
                  style={{
                    backgroundImage:
                      "url('https://cdn.usegalileo.ai/sdxl10/4459c9a2-69e5-4aea-9a7f-a2873ce52939.png')",
                  }}
                ></div>
                <div class="flex flex-1 flex-col justify-center">
                  <p class="text-[#0d161c] text-base font-medium leading-normal">
                    Isabella Rodriguez @isabellarod
                  </p>
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    It also includes a like button and a retweet button.
                  </p>
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    This is an example of a tweet with a longer body of text.
                    This tweet has a call to action to follow the user.
                  </p>
                </div>
              </div>
              <div class="shrink-0">
                <div
                  class="text-[#0d161c] flex size-7 items-center justify-center"
                  data-icon="Heart"
                  data-size="24px"
                  data-weight="regular"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,220.66,240,164,240,94A62.07,62.07,0,0,0,178,32ZM128,206.8C109.74,196.16,32,147.69,32,94A46.06,46.06,0,0,1,78,48c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,147.61,146.24,196.15,128,206.8Z"></path>
                  </svg>
                </div>
              </div>
            </div>}

        
            <div class="flex gap-4 bg-slate-50 px-4 py-3 justify-between">
              <div class="flex items-start gap-4">
                <div
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-[70px] w-fit"
                  style={{
                    backgroundImage:
                      "url('https://cdn.usegalileo.ai/sdxl10/4459c9a2-69e5-4aea-9a7f-a2873ce52939.png')",
                  }}
                ></div>
                <div class="flex flex-1 flex-col justify-center">
                  <p class="text-[#0d161c] text-base font-medium leading-normal">
                    Isabella Rodriguez @isabellarod
                  </p>
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    It also includes a like button and a retweet button.
                  </p>
                  <p class="text-[#4b7b9b] text-sm font-normal leading-normal">
                    This is an example of a tweet with a longer body of text.
                    This tweet has a call to action to follow the user.
                  </p>
                </div>
              </div>
              <div class="shrink-0">
                <div
                  class="text-[#0d161c] flex size-7 items-center justify-center"
                  data-icon="Heart"
                  data-size="24px"
                  data-weight="regular"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24px"
                    height="24px"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M178,32c-20.65,0-38.73,8.88-50,23.89C116.73,40.88,98.65,32,78,32A62.07,62.07,0,0,0,16,94c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,220.66,240,164,240,94A62.07,62.07,0,0,0,178,32ZM128,206.8C109.74,196.16,32,147.69,32,94A46.06,46.06,0,0,1,78,48c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,147.61,146.24,196.15,128,206.8Z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
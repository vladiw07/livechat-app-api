import React, { useEffect, useState } from "react";
import { toast } from 'react-toastify';
import '../css/ChatContactsSection.css'
import '../css/ChatPage.css';
import { useNavigate } from 'react-router-dom';

function ChatsSection({ fetchMessages }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [error, setError] = useState('');
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);

  const accountEmail = localStorage.getItem('loggedInEmail');
  
  const [accountUsername, setAccountUsername] = useState('');
  const navigate = useNavigate();

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const fetchUsername = async () => {
    if (!accountEmail) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/get-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountEmail }),
      });

      const data = await response.json();
      if (response.ok && data.username) {
        setAccountUsername(data.username);
      } else {
        toast.error("Failed to fetch username.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching the username.");
    }
  };
  
  const handleFriendClick = async (friendId) => {
    console.log("Clicked friend ID:", friendId);
    const loggedInEmail = localStorage.getItem("loggedInEmail");
  
    if (!loggedInEmail) {
      toast.error("You must be logged in to chat.");
      return;
    }
  
    try {
      // Step 1: Check if chat exists
      let chatResponse = await fetch(`${API_BASE_URL}/get-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail, otherUserId: friendId }),
      });
  
      let chatData = await chatResponse.json();
  
      if (chatResponse.ok && chatData.messages.length > 0) {
        // ✅ Chat exists, store chat info and fetch messages
        localStorage.setItem("openedChatUserId", friendId);
        fetchMessages();  // Call fetchMessages() only if chat exists
        console.log("Chat exists. Messages retrieved:", chatData.messages);
        return; // Exit after fetching messages
      }
  
      // Step 2: No chat found, create one
      console.log("No existing chat. Creating one...");
      const createChatResponse = await fetch(`${API_BASE_URL}/create-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail, otherUserId: friendId }),
      });
  
      let createChatData = await createChatResponse.json();
  
      if (!createChatResponse.ok) {
        toast.error(createChatData.message || "Failed to create chat.");
        return;
      }
  
      console.log("Chat created successfully:", friendId);
  
      // Step 3: After creation, immediately try to fetch the messages
      chatResponse = await fetch(`${API_BASE_URL}/get-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail, otherUserId: friendId }),
      });
  
      chatData = await chatResponse.json();
  
      if (chatResponse.ok && chatData.messages.length > 0) {
        localStorage.setItem("openedChatUserId", friendId);
        fetchMessages();  // Call fetchMessages() only after creating chat
        console.log("Messages fetched after creating the chat:", chatData.messages);
      } else {
        toast.error("Failed to fetch messages after chat creation.");
      }
    } catch (error) {
      toast.error("An error occurred while handling the chat.");
    }
  };
  
  
  
  
  
  
  


  const handleAddFriendInputChange = (e) => {
    setAddFriendInput(e.target.value);
  };

  const handleSendFriendRequest = async () => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (!loggedInEmail) {
      toast.error("You must be logged in to send a friend request.");
      return;
    }

    if (!addFriendInput) {
      toast.error("Please enter a receiver's username.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/send-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail: loggedInEmail, receiverUsername: addFriendInput }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Friend request sent successfully!");
        setError('');
      } else {
        toast.error(data.message || "Failed to send friend request.");
      }
    } catch (error) {
      toast.error("An error occurred while sending the friend request.");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (!loggedInEmail) {
      toast.error("You must be logged in to accept a friend request.");
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/accept-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInEmail, requestId, status: 'accepted' }),
      });
  
      const data = await response.json();
      if (response.ok) {
        console.log("Friend request accepted!");
        
        // Remove the accepted request from incomingRequests
        setIncomingRequests(prev => prev.filter(req => req.request_id !== requestId));
  
        // Fetch updated friends list (this ensures no duplicates)
        fetchFriends();
      } else {
        toast.error(data.message || "Failed to accept friend request.");
      }
    } catch (error) {
      toast.error("An error occurred while accepting the friend request.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (!loggedInEmail) {
      toast.error("You must be logged in to reject a friend request.");
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/reject-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInEmail, requestId, status: 'rejected' }),
      });
  
      const data = await response.json();
      if (response.ok) {
        console.log("Friend request rejected!");
        
        // Remove from frontend
        setIncomingRequests(prev => prev.filter(req => req.request_id !== requestId));
  
        // Fetch updated requests to sync with backend
        fetchIncomingRequests();
      } else {
        toast.error(data.message || "Failed to reject friend request.");
      }
    } catch (error) {
      toast.error("An error occurred while rejecting the friend request.");
    }
  };

  const fetchIncomingRequests = async () => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (!loggedInEmail) {
      toast.error("You must be logged in to fetch friend requests.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/incoming-friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInEmail }),
      });

      const data = await response.json();
      if (response.ok) {
        setIncomingRequests(Array.isArray(data.requests) ? data.requests : []);
      } else {
        toast.error(data.message || "Failed to fetch friend requests.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching friend requests.");
    }
  };

  const fetchFriends = async () => {
    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (!loggedInEmail) {
      toast.error("You must be logged in to fetch friends.");
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/get-friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loggedInEmail }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("Friends list:", data.friends);
        if (Array.isArray(data.friends)) {
          setFriends(data.friends);
        } else {
          toast.error("Invalid data format: 'friends' is not an array.");
        }
      } else {
        toast.error(data.message || "Failed to fetch friends.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching friends.");
    }
  };
  
  // Now use it inside useEffect
  useEffect(() => {
    fetchIncomingRequests();
    fetchUsername();
    fetchFriends();
  }, []);




    return (
    <div className='ChatsSection'>
    <div>
      <div className='ChatHeaderAndFriendsIcon'>
        
        <p>Chats</p>
        <div className='line'></div>
        <svg  onClick={toggleModal} id="Plus_24" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(0.83) translate(2,2)">
    <path d="M 15 3 C 8.373 3 3 8.373 3 15 C 3 21.627 8.373 27 15 27 C 21.627 27 27 21.627 27 15 C 27 8.373 21.627 3 15 3 z M 21 16 L 16 16 L 16 21 C 16 21.553 15.552 22 15 22 C 14.448 22 14 21.553 14 21 L 14 16 L 9 16 C 8.448 16 8 15.553 8 15 C 8 14.447 8.448 14 9 14 L 14 14 L 14 9 C 14 8.447 14.448 8 15 8 C 15.552 8 16 8.447 16 9 L 16 14 L 21 14 C 21.552 14 22 14.447 22 15 C 22 15.553 21.552 16 21 16 z" 
          fill="black" stroke="none"/>
  </g>
</svg>


      
      </div>

      <ul className='Contacts'>
          {incomingRequests.length > 0 ? (
            incomingRequests.map((request, index) => (
              <li className="friendRequestLi" key={index}>
                <img src="/BlankProfilePicture.png" alt="" />
                <header>{request.senderUsername}</header>
                <div className="friendRequestIconsDiv">
                <svg xmlns="http://www.w3.org/2000/svg" width="22px" height="22px" viewBox="0 0 121.31 122.876" onClick={() => handleRejectRequest(request.request_id)}>
  <path fill="rgb(235, 51, 60)" fillRule="evenodd" clipRule="evenodd" d="M90.914,5.296c6.927-7.034,18.188-7.065,25.154-0.068 c6.961,6.995,6.991,18.369,0.068,25.397L85.743,61.452l30.425,30.855c6.866,6.978,6.773,18.28-0.208,25.247 c-6.983,6.964-18.21,6.946-25.074-0.031L60.669,86.881L30.395,117.58c-6.927,7.034-18.188,7.065-25.154,0.068 c-6.961-6.995-6.992-18.369-0.068-25.397l30.393-30.827L5.142,30.568c-6.867-6.978-6.773-18.28,0.208-25.247 c6.983-6.963,18.21-6.946,25.074,0.031l30.217,30.643L90.914,5.296L90.914,5.296z"/>
               </svg>

                <svg xmlns="http://www.w3.org/2000/svg" width="22px" height="22px" viewBox="0 0 122.881 122.88" onClick={() => handleAcceptRequest(request.request_id)}>
                <path fill='rgb(7, 199, 55)' fillRule="evenodd" clipRule="evenodd" d="M61.44,0c33.933,0,61.441,27.507,61.441,61.439 c0,33.933-27.508,61.44-61.441,61.44C27.508,122.88,0,95.372,0,61.439C0,27.507,27.508,0,61.44,0L61.44,0z M34.106,67.678 l-0.015-0.014c-0.785-0.718-1.207-1.685-1.256-2.669c-0.049-0.982,0.275-1.985,0.984-2.777c0.01-0.011,0.019-0.021,0.029-0.031 c0.717-0.784,1.684-1.207,2.668-1.256c0.989-0.049,1.998,0.28,2.792,0.998l12.956,11.748l31.089-32.559v0 c0.74-0.776,1.723-1.18,2.719-1.204c0.992-0.025,1.994,0.329,2.771,1.067v0.001c0.777,0.739,1.18,1.724,1.205,2.718 c0.025,0.993-0.33,1.997-1.068,2.773L55.279,81.769c-0.023,0.024-0.048,0.047-0.073,0.067c-0.715,0.715-1.649,1.095-2.598,1.13 c-0.974,0.037-1.963-0.293-2.744-1L34.118,67.688L34.106,67.678L34.106,67.678L34.106,67.678z"/>
                </svg>
                </div>


              </li>
            ))
          ) : (
            <li>No incoming friend requests.</li>
          )}
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <li className="friendRequestLi" key={index} onClick={() => handleFriendClick(friend.user_id)}>
                <img src="/BlankProfilePicture.png" alt="" />
                <header>{friend.username}</header>
              </li>
            ))
          ) : (
            <li>No friends found.</li>
          )}

        </ul>

        


      <div className='userInfo'>
        <img src="/BlankProfilePicture.png" alt="" />
        <p>{accountUsername}</p>
        <button onClick={()=>{localStorage.setItem('loggedInEmail', ''); navigate('/');}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 89.149 122.88" width="100%" height="100%">
  <g>
    <path d="M79.128,64.598H40.069c-1.726,0-3.125-1.414-3.125-3.157c0-1.744,1.399-3.158,3.125-3.158h39.057L66.422,43.733 c-1.14-1.301-1.019-3.289,0.269-4.439c1.288-1.151,3.257-1.03,4.396,0.271l17.281,19.792c1.061,1.211,1.029,3.019-0.02,4.19 l-17.262,19.77c-1.14,1.302-3.108,1.423-4.396,0.271c-1.287-1.151-1.408-3.139-0.269-4.44L79.128,64.598L79.128,64.598z M42.396,116.674c1.689,0.409,2.727,2.11,2.318,3.799c-0.409,1.689-2.109,2.728-3.799,2.318c-3.801-0.922-7.582-1.671-11.052-2.358 C10.426,116.583,0,114.519,0,86.871V34.188C0,7.96,11.08,5.889,29.431,2.46c3.572-0.667,7.448-1.391,11.484-2.371 c1.689-0.409,3.39,0.629,3.799,2.319c0.408,1.689-0.629,3.39-2.318,3.799c-4.291,1.041-8.201,1.771-11.805,2.445 C15.454,11.48,6.315,13.188,6.315,34.188v52.683c0,22.467,8.643,24.179,24.756,27.37C34.453,114.911,38.138,115.642,42.396,116.674 L42.396,116.674z"/>
  </g>
</svg>
</button>
      </div>
      
      
    </div>


    

    {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add friends</h2>
            <input value={addFriendInput} onChange={handleAddFriendInputChange} type="text" placeholder="Enter user name" />
            <button onClick={handleSendFriendRequest}>Send Request</button>
            <div className="modalSvgDiv"><svg onClick={(toggleModal)} version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="15px" height="15px" viewBox="0 0 122.878 122.88" enable-background="new 0 0 122.878 122.88">
  <g>
    <path d="M1.426,8.313c-1.901-1.901-1.901-4.984,0-6.886c1.901-1.902,4.984-1.902,6.886,0l53.127,53.127l53.127-53.127c1.901-1.902,4.984-1.902,6.887,0c1.901,1.901,1.901,4.985,0,6.886L68.324,61.439l53.128,53.128c1.901,1.901,1.901,4.984,0,6.886c-1.902,1.902-4.985,1.902-6.887,0L61.438,68.326L8.312,121.453c-1.901,1.902-4.984,1.902-6.886,0c-1.901-1.901-1.901-4.984,0-6.886l53.127-53.128L1.426,8.313L1.426,8.313z"/>
  </g>
</svg></div>



          </div>
        </div>
      )}
    </div>
    
  )
}

export default ChatsSection

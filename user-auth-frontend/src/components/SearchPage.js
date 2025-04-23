import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search as SearchIcon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAuthContract } from '../UserAuth';
import './SearchPage.css';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // First try blockchain search
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      
      // Save to recent searches
      if (results.length > 0) {
        const newRecentSearches = [
          { query: searchQuery, timestamp: Date.now() },
          ...recentSearches.filter(s => s.query !== searchQuery)
        ].slice(0, 5); // Keep only 5 most recent
        
        setRecentSearches(newRecentSearches);
        localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchUsers = async (query) => {
    // Get all usernames from localStorage
    const usernameKeys = Object.keys(localStorage).filter(key => key.startsWith('username_'));
    const results = [];
    
    // Search through localStorage first (faster)
    for (const key of usernameKeys) {
      const address = key.replace('username_', '');
      const storedUsername = localStorage.getItem(key);
      
      if (storedUsername && 
          storedUsername.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          address,
          username: storedUsername
        });
      }
    }
    
    // If we found results in localStorage, return them
    if (results.length > 0) {
      return results;
    }
    
    // Otherwise try to search on the blockchain
    try {
      const contract = await UserAuthContract();
      // This assumes your contract has a searchUsers function
      // You may need to adapt this to your contract's actual API
      const blockchainResults = await contract.methods.searchUsers(query).call();
      
      return blockchainResults.map(result => ({
        address: result.userAddress,
        username: result.username
      }));
    } catch (error) {
      console.error("Blockchain search error:", error);
      return results; // Return what we got from localStorage
    }
  };

  const handleUserClick = (user) => {
    navigate(`/profile/${user.username}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const renderRecentSearches = () => {
    if (recentSearches.length === 0) return null;
    
    return (
      <div className="recent-searches">
        <div className="recent-header">
          <h3>Recent searches</h3>
          <button onClick={handleClearRecent}>Clear</button>
        </div>
        <div className="recent-list">
          {recentSearches.map((item, index) => (
            <div 
              key={index} 
              className="recent-item"
              onClick={() => {
                setSearchQuery(item.query);
                handleSearch({ preventDefault: () => {} });
              }}
            >
              <SearchIcon size={16} />
              <span>{item.query}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-container">
            <SearchIcon size={18} />
            <input
              type="text"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </form>
      </div>
      
      <div className="search-content">
        {isSearching ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        ) : searchQuery ? (
          searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.map((user, index) => (
                <div 
                  key={index} 
                  className="search-result-item"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="result-avatar">
                    {user.username ? user.username[0].toUpperCase() : 
                     user.address ? user.address.substring(0, 2) : '?'}
                  </div>
                  <div className="result-info">
                    <h4>{user.username}</h4>
                    <p className="result-address">
                      {user.address.substring(0, 6)}...{user.address.substring(38)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <User size={40} />
              <p>No users found matching "{searchQuery}"</p>
            </div>
          )
        ) : (
          renderRecentSearches()
        )}
      </div>
    </div>
  );
};

export default SearchPage; 
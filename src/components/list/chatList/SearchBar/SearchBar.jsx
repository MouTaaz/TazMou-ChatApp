import { useState, useEffect } from "react";
import useSessionStore from "../../../../lib/useStore";
import "./searchBar.css";

const SearchBar = () => {
  const setSearchQuery = useSessionStore((state) => state.setSearchQuery);
  const [localQuery, setLocalQuery] = useState(""); // Local state for debouncing

  // Debounce the search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("SearchBar - Setting search query in store:", localQuery); // Debugging log
      setSearchQuery(localQuery);
    }, 300);

    return () => {
      console.log("SearchBar - Clearing debounce timer"); // Debugging log
      clearTimeout(timer);
    };
  }, [localQuery, setSearchQuery]);

  return (
    <div className="searchBar">
      <img src="./search.png" alt="search" />
      <input
        type="text"
        value={localQuery}
        onChange={(e) => {
          console.log("SearchBar - Input changed:", e.target.value); // Debugging log
          setLocalQuery(e.target.value);
        }}
        placeholder="Filter Chats..."
      />
    </div>
  );
};

export default SearchBar;

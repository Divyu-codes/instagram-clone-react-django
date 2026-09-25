import { useEffect, useState } from "react";
import SearchBar from "../../components/search/SearchBar";
import SearchResults from "../../components/search/SearchResults";
import { authenticatedFetch } from "../../utils/auth";

function Search() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);

        const response = await authenticatedFetch(
          "http://127.0.0.1:8000/api/users/"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();

        console.log("SEARCH USERS API:", data);

        const cleanedUsers = (Array.isArray(data) ? data : []).filter(
          (user) => {
            const username = String(user?.username || "").trim();

            return (
              Boolean(username) &&
              !user?.is_staff &&
              !user?.is_superuser
            );
          }
        );

        setUsers(cleanedUsers);
      } catch (error) {
        console.error("Search users error:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <div className="p-8">
      <SearchBar
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p className="mt-4">
        Searching: {query}
      </p>

      <p>
        {loading
          ? "Loading users..."
          : `Users loaded: ${users.length}`}
      </p>

      <SearchResults
        users={users}
        query={query}
      />
    </div>
  );
}

export default Search;
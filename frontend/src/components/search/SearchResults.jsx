import UserCard from "./UserCard";

function SearchResults({ users, query }) {

  const filteredUsers = users.filter((user) =>
    user.username
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="mt-5">

      {filteredUsers.map((user) => {

        const userId = Number(user.user_id);

        return (
          <UserCard
            key={userId}
            id={userId}
            username={user.username}
            image={user.profile_image}
            posts={user.posts_count}
          />
        );
      })}

    </div>
  );
}

export default SearchResults;


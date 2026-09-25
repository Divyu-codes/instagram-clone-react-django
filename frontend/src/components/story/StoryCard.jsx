function StoryCard({ username, image }) {
    return (
    <div className="flex flex-col items-center min-w-[80px]">

      <img
        src={image}
        alt={username}
        className="w-16 h-16 rounded-full border-2 border-pink-500 p-1 object-cover"
      />

      <p className="text-sm mt-2">
        {username}
      </p>

    </div>
  );
}

export default StoryCard;
function PostHeader({ username, location }) {
    return (
        <div className="flex items-center justify-between p-4">

            <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-gray-300"></div>

                <div>
                    <h3>{username}</h3>
                    <p>{location}</p>
                </div>

            </div>

            <button>•••</button>

        </div>
    );
}

export default PostHeader;
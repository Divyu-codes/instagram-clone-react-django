function PostFooter({ likes, username, caption }) {

    return (

        <div className="px-4 pb-4">

            <p className="font-semibold">

                {likes} Likes

            </p>

            <p>

                <span className="font-semibold">

                    {username}

                </span>

                {" "}

                {caption}

            </p>

        </div>

    )

}
export default PostFooter;
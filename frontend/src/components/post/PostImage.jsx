function PostImage({ image }) {
    return (
        <img
            src={image}
            alt="post"
            className="w-full h-96 object-cover"
        />
    );
}

export default PostImage;
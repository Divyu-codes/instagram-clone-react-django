import { FaPlusSquare } from "react-icons/fa";

function CreatePostButton({onClick}) {
  return (
    <button 
    onClick={onClick}
    className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
      <FaPlusSquare />
      Create
    </button>
  );
}

export default CreatePostButton;
function SearchBar({ value, onChange }) {
    return (
         <input
      type="text"
      placeholder="Search users..."
      value={value}
      onChange={onChange}
      className="w-full border rounded-lg p-3"
    />
    );
}
export default SearchBar;

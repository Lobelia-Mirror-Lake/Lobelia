import { Button } from "react-bootstrap";

function BackButton({ size = 48, onClick, className = "" }) {
  return (
    <Button
        className={className}
        onClick={onClick}
        aria-label={"back"}
    >
        <svg width="36" height="36" viewBox="0 0 16 16" fill="none">
        <path
            d="
                M 14 8
                H 3
                l 4 -4
                M 3 8
                l 4 4
            "
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        </svg>
    </Button>
  );
}

export default BackButton;
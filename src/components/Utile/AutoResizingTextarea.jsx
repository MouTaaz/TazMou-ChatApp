// AutoResizingTextarea.js
import { useRef, useEffect } from "react";

function AutoResizingTextarea({
  value,
  onChange,
  minRows = 1,
  maxRows = 5,
  onKeyDown,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;

    // Reset height
    ta.style.height = "auto";

    // Grow to fit content
    ta.style.height = `${ta.scrollHeight}px`;

    // Clamp to maxRows
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight);
    const maxHeight = lineHeight * maxRows;
    if (ta.scrollHeight > maxHeight) {
      ta.style.overflowY = "auto";
      ta.style.height = `${maxHeight}px`;
    } else {
      ta.style.overflowY = "hidden";
    }
  }, [value, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      placeholder="Type a message"
      onKeyDown={onKeyDown}
    />
  );
}

export default AutoResizingTextarea;

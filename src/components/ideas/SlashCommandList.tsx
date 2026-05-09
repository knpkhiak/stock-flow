import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface SlashItem {
  title: string;
  aliases: string[];
  icon: string;
  command: (opts: { editor: any; range: any }) => void;
}

interface Props {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashCommandList = forwardRef<any, Props>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return <div className="slash-cmd-menu"><div className="slash-cmd-empty">결과 없음</div></div>;
  }

  return (
    <div className="slash-cmd-menu">
      {items.map((item, i) => (
        <div
          key={item.title}
          className={`slash-cmd-item ${i === selected ? "is-selected" : ""}`}
          onMouseEnter={() => setSelected(i)}
          onClick={() => command(item)}
        >
          <span className="slash-cmd-icon">{item.icon}</span>
          <span>{item.title}</span>
        </div>
      ))}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
export default SlashCommandList;

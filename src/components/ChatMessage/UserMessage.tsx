import { useState } from "react";

import { CopyButton } from "@/components/Common/CopyButton";

interface UserMessageProps {
  messageContent: string;
}

export const UserMessage = ({ messageContent }: UserMessageProps) => {
  const [showCopyButton, setShowCopyButton] = useState(false);

  return (
    <div
      className="flex gap-1 items-center"
      onMouseEnter={() => setShowCopyButton(true)}
      onMouseLeave={() => setShowCopyButton(false)}
    >
      {showCopyButton && <CopyButton textToCopy={messageContent} />}
      <div
        className="px-3 py-2 bg-white dark:bg-[#202126] rounded-xl border border-black/12 dark:border-black/15 font-normal text-sm text-[#333333] dark:text-[#D8D8D8] cursor-pointer select-none"
        onDoubleClick={(e) => {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(e.currentTarget);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }}
      >
        {messageContent}
      </div>
    </div>
  );
};

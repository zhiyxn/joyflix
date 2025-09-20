'use client';

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useRef,
  MutableRefObject,
  useState,
} from 'react';

const SiteContext = createContext<{
  siteName: string;
  announcement?: string;
  mainContainerRef?: MutableRefObject<HTMLDivElement | null>;
  isSerialSpeedTest: boolean;
  setIsSerialSpeedTest: Dispatch<SetStateAction<boolean>>;
}>({
  siteName: 'JoyFlix',
  announcement: '切勿分享本站，以维持使用体验哦 ʕ •ᴥ•ʔ～✰✰',
  mainContainerRef: undefined,
  isSerialSpeedTest: false,
  setIsSerialSpeedTest: () => {},
});

export const useSite = () => useContext(SiteContext);

export function SiteProvider({
  children,
  siteName,
  announcement,
}: {
  children: ReactNode;
  siteName: string;
  announcement?: string;
}) {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const [isSerialSpeedTest, setIsSerialSpeedTest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('isSerialSpeedTest');
      if (saved !== null) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parse error, return default
        }
      }
    }
    return false; // Default value if nothing in localStorage or parse fails
  });

  return (
    <SiteContext.Provider
      value={{
        siteName,
        announcement,
        mainContainerRef,
        isSerialSpeedTest,
        setIsSerialSpeedTest,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

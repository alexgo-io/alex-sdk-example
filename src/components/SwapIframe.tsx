import { useEffect, useRef, useState } from 'react';

const SwapIframe: React.FC = () => {
  const [height, setHeight] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'xlink-iframe-resize') {
        console.log('iframe resized', event.data.height);
        setHeight(event.data.height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        height: height ? `${height}px` : '552px',
        maxHeight: 'calc(100vh - 40px)',
        minHeight: '552px',
        transition: 'height 0.3s ease-in-out',
      }}
    >
      <iframe
        ref={iframeRef}
        src="http://localhost:3101/bitcoin/swap?embedded=true&toToken=brc20%3A0%3A%24stx%24"
        style={{
          width: '400px',
          height: '100%',
          border: 'none',
        }}
        title="Swap Interface"
      />
    </div>
  );
};

export default SwapIframe; 
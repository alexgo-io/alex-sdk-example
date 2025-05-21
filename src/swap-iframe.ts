interface SwapIframeData {
  type: string;
  height: number;
}

const collapseButton = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="40" height="40" rx="20" fill="black"/>
<path d="M24.59 16.295L20 20.875L15.41 16.295L14 17.705L20 23.705L26 17.705L24.59 16.295Z" fill="white"/>
</svg>
`

const broButton = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="40" height="40" rx="20" fill="#1A1A1A"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M16.875 13.75C16.875 12.0241 15.4759 10.625 13.75 10.625C12.0241 10.625 10.625 12.0241 10.625 13.75C10.625 15.4759 12.0241 16.875 13.75 16.875H7.5V20C10.0888 20 12.1875 22.0987 12.1875 24.6875V29.375H15.3125V24.6875C15.3125 22.0987 17.4112 20 20 20C22.5888 20 24.6875 22.0987 24.6875 24.6875V29.375H27.8125V24.6875C27.8125 22.0987 29.9112 20 32.5 20V16.875H26.25C27.9759 16.875 29.375 15.4759 29.375 13.75C29.375 12.0241 27.9759 10.625 26.25 10.625C24.5241 10.625 23.125 12.0241 23.125 13.75C23.125 15.4759 24.5241 16.875 26.25 16.875H13.75C15.4759 16.875 16.875 15.4759 16.875 13.75Z" fill="white"/>
</svg>
`

const broButtonHasNotification = `
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="40" height="40" rx="20" fill="#FF4C32"/>
</svg>
`

const DEFAULT_HEIGHT = 552

class SwapIframe {
  private container!: HTMLDivElement;
  private iframe!: HTMLIFrameElement;
  private currentHeight: number = DEFAULT_HEIGHT;
  private button!: HTMLDivElement;
  private isExpanded: boolean = false;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  private initializeElements(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.bottom = '60px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '1000';
    this.container.style.borderRadius = '8px';
    this.container.style.overflow = 'hidden';
    this.container.style.height = '0px'; // Start with 0 height
    this.container.style.maxHeight = 'calc(100vh - 40px)';
    this.container.style.minHeight = '0px'; // Allow full collapse
    this.container.style.transition = 'height 0.3s ease-in-out';

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = 'https://xlink-mainnet.beta.alexgo.dev/bitcoin/swap?embedded=true&toToken=brc20%3A0%3A%24stx%24';
    this.iframe.style.width = '400px';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.title = 'Swap Interface';

    // Create button
    this.button = document.createElement('div');
    this.button.style.position = 'fixed';
    this.button.style.bottom = '10px';
    this.button.style.right = '20px';
    this.button.style.zIndex = '1001';
    this.button.style.cursor = 'pointer';
    this.button.innerHTML = broButton;

    // Append iframe to container
    this.container.appendChild(this.iframe);
  }

  private setupEventListeners(): void {
    window.addEventListener('message', (event: MessageEvent<SwapIframeData>) => {
      if (event.data.type === 'xlink-iframe-resize') {
        console.log('iframe resized', event.data.height);
        this.currentHeight = event.data.height;
        if (this.isExpanded) {
          this.container.style.height = `${this.currentHeight}px`;
        }
      }
    });

    this.button.addEventListener('click', () => {
      this.toggleExpand();
    });
  }

  private toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.container.style.minHeight = `${DEFAULT_HEIGHT}px`;
      this.container.style.height = `${this.currentHeight}px`;
      this.button.innerHTML = collapseButton;
    } else {
      this.container.style.minHeight = '0px';
      this.container.style.height = '0px';
      this.button.innerHTML = broButton;
    }
  }

  public mount(): void {
    document.body.appendChild(this.container);
    document.body.appendChild(this.button);
  }
}

// Initialize and mount the swap iframe when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const swapIframe = new SwapIframe();
  swapIframe.mount();
}); 
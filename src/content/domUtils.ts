export function extractIframeDOM(): string | null {
  try {
    const iframe = document.querySelector('#live-preview-panel') as HTMLIFrameElement;
    if (!iframe) {
      return null;
    }

    if (!iframe.contentDocument && !iframe.contentWindow) {
      return null;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      return null;
    }

    const body = iframeDoc.body;
    if (!body) {
      return null;
    }

    const clonedBody = body.cloneNode(true) as HTMLElement;
    
    const scripts = clonedBody.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    const styles = clonedBody.querySelectorAll('style');
    styles.forEach(style => style.remove());

    const domContent = clonedBody.outerHTML;
    
    return domContent.length > 50000 ? domContent.substring(0, 50000) + '...' : domContent;
  } catch (error) {
    return null;
  }
}

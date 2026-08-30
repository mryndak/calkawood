// Ładowanie widgetu Google reCAPTCHA v2 w komponentach React (client-only).
// Skrypt jest wspólny dla całej karty, więc ładujemy go raz i cache'ujemy
// obietnicę — kolejne wywołania z tego samego widoku dostają tę samą instancję.

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, params: { sitekey: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadRecaptcha(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window niedostępne'));
  if (window.grecaptcha?.render) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    window.onRecaptchaLoad = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return loadPromise;
}

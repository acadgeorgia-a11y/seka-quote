/// <reference types="@types/google.maps" />
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

let apiState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
const waiters: (() => void)[] = [];

function loadPlacesApi(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (apiState === 'ready') { resolve(); return; }
    if (apiState === 'error') { reject(new Error('Google Maps failed to load')); return; }
    waiters.push(resolve);
    if (apiState === 'loading') return;
    apiState = 'loading';
    (window as Window & { _gmapsReady?: () => void })._gmapsReady = () => {
      apiState = 'ready';
      waiters.forEach((fn) => fn());
      waiters.length = 0;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_gmapsReady`;
    script.async = true;
    script.onerror = () => { apiState = 'error'; reject(new Error('Script failed')); };
    document.head.appendChild(script);
  });
}

interface Props {
  value: string;
  onChange: (address: string, zip: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(apiState === 'ready');

  // Keep the ref pointing at the latest onChange without re-attaching the listener
  useLayoutEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    loadPlacesApi(key)
      .then(() => {
        setReady(true);
        if (!inputRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'address_components'],
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const formatted = place.formatted_address ?? '';
          const zipComp = place.address_components?.find((c) =>
            c.types.includes('postal_code'),
          );
          const zip = zipComp?.short_name ?? '';
          // Always uses latest onChange via ref — no stale closure
          onChangeRef.current(formatted, zip);
        });

        autocompleteRef.current = ac;
      })
      .catch(() => setReady(false));

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Sync external value changes into the uncontrolled input
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      />
      {!ready && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

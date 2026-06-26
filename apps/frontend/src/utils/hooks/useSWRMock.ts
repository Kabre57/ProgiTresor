import { useState, useEffect } from 'react';

export default function useSWR<Data = any, Error = any>(
  key: string | null | undefined,
  fetcher?: (...args: any[]) => Promise<Data> | Data,
  options?: any
) {
  const [data, setData] = useState<Data | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!key || !fetcher) return;

    let active = true;
    setIsValidating(true);

    Promise.resolve(fetcher())
      .then((res) => {
        if (active) {
          setData(res);
          setIsValidating(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setIsValidating(false);
        }
      });

    return () => {
      active = false;
    };
  }, [key, fetcher]);

  const mutate = (newData: any, revalidate = false) => {
    setData((current) => {
      const next = typeof newData === 'function' ? newData(current) : newData;
      return next;
    });
  };

  return {
    data,
    error,
    isValidating,
    mutate,
  };
}

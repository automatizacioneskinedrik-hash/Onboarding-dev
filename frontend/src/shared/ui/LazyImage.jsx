import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_ROOT_MARGIN = '180px';
const DEFAULT_THRESHOLD = 0.01;

const LazyImageInner = ({
    src,
    alt,
    className = '',
    loadedClassName = '',
    pendingClassName = '',
    fallback = null,
    keepFallbackUntilLoaded = false,
    eager = false,
    rootMargin = DEFAULT_ROOT_MARGIN,
    threshold = DEFAULT_THRESHOLD,
    loading,
    decoding = 'async',
    onLoad,
    onError,
    ...imgProps
}) => {
    const canObserve = typeof window !== 'undefined' && 'IntersectionObserver' in window;
    const imageRef = useRef(null);
    const [shouldLoad, setShouldLoad] = useState(() => Boolean(src) && (eager || !canObserve));
    const [status, setStatus] = useState(() => {
        if (!src) {
            return 'idle';
        }

        return eager || !canObserve ? 'loading' : 'idle';
    });

    useEffect(() => {
        if (!src || shouldLoad || !canObserve) {
            return undefined;
        }

        const node = imageRef.current;

        if (!node) {
            return undefined;
        }

        const observer = new window.IntersectionObserver(
            (entries) => {
                const isVisible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);

                if (isVisible) {
                    setShouldLoad(true);
                    setStatus('loading');
                    observer.disconnect();
                }
            },
            { rootMargin, threshold }
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, [canObserve, rootMargin, shouldLoad, src, threshold]);

    const handleLoad = (event) => {
        setStatus('loaded');
        onLoad?.(event);
    };

    const handleError = (event) => {
        setStatus('error');
        onError?.(event);
    };

    const shouldRenderImage = Boolean(src) && status !== 'error';
    const shouldShowFallback =
        Boolean(fallback) &&
        (!shouldRenderImage || status === 'error' || (keepFallbackUntilLoaded && status !== 'loaded'));
    const imageClassName = [className, status === 'loaded' ? loadedClassName : pendingClassName]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            {shouldShowFallback ? fallback : null}
            {shouldRenderImage ? (
                <img
                    ref={imageRef}
                    src={shouldLoad ? src : undefined}
                    alt={alt}
                    loading={loading || (eager ? 'eager' : 'lazy')}
                    decoding={decoding}
                    className={imageClassName || undefined}
                    onLoad={handleLoad}
                    onError={handleError}
                    {...imgProps}
                />
            ) : null}
        </>
    );
};

const LazyImage = (props) => (
    <LazyImageInner key={`${props.src || 'empty'}:${props.eager ? 'eager' : 'lazy'}`} {...props} />
);

export default LazyImage;

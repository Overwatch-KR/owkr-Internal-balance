import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { toPng } from 'html-to-image';

type CopyStatus = 'idle' | 'loading' | 'success' | 'error';
const EXPORT_PADDING = 32;

/**
 * @description html-to-image를 이용해 요소를 이미지로 캡처하고 클립보드에 복사하는 훅.
 * @param ref - 캡처할 요소의 ref
 * @returns copyStatus, handleCopyImage
 */
export const useCopyImage = (ref: RefObject<HTMLDivElement | null>) => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
    const resetTimerRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    }, []);

    const resetStatusLater = useCallback((): void => {
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), 2000);
    }, []);

    const handleCopyImage = useCallback(async () => {
        if (!ref.current) return;
        const captureElement = ref.current;
        setCopyStatus('loading');
        captureElement.setAttribute('data-exporting', 'true');

        try {
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

            const captureStyle = window.getComputedStyle(captureElement);
            const contentWidth = captureElement.clientWidth
                - Number.parseFloat(captureStyle.paddingLeft)
                - Number.parseFloat(captureStyle.paddingRight);
            const contentHeight = captureElement.clientHeight
                - Number.parseFloat(captureStyle.paddingTop)
                - Number.parseFloat(captureStyle.paddingBottom);
            const exportWidth = contentWidth + (EXPORT_PADDING * 2);
            const exportHeight = contentHeight + (EXPORT_PADDING * 2);
            const dataUrl = await toPng(captureElement, {
                backgroundColor: '#0b0c10',
                width: exportWidth,
                height: exportHeight,
                pixelRatio: 3,
                cacheBust: true,
                style: {
                    boxSizing: 'border-box',
                    padding: `${EXPORT_PADDING}px`,
                },
                filter: (node) => !(node instanceof HTMLElement && (
                    node.hasAttribute('data-exclude-export')
                    || node.hasAttribute('data-html2canvas-ignore')
                )),
            });

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

            setCopyStatus('success');
        } catch (error) {
            console.error(error);
            setCopyStatus('error');
        } finally {
            captureElement.removeAttribute('data-exporting');
            resetStatusLater();
        }
    }, [ref, resetStatusLater]);

    return { copyStatus, handleCopyImage };
};

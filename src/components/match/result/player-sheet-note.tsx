import { MessageSquareText } from 'lucide-react';

interface PlayerSheetNoteProps {
    align: 'left' | 'right';
    note?: string;
}

/**
 * @description 유저 시트의 특이사항을 화면에만 표시하고 이미지 내보내기에서는 제외한다.
 */
export function PlayerSheetNote({ align, note }: PlayerSheetNoteProps) {
    const cleanNote = note?.trim();
    if (!cleanNote) return null;

    return (
        <div
            data-exclude-export
            data-html2canvas-ignore="true"
            className={`mt-1 flex min-w-0 items-center gap-1 text-[10px] leading-tight text-emerald-300/80 ${
                align === 'right' ? 'justify-end' : 'justify-start'
            }`}
            title={`시트 특이사항: ${cleanNote}`}
            aria-label={`시트 특이사항: ${cleanNote}`}
        >
            {align === 'left' && (
                <MessageSquareText size={11} className="shrink-0" aria-hidden="true" />
            )}
            <span className="max-w-full truncate">{cleanNote}</span>
            {align === 'right' && (
                <MessageSquareText size={11} className="shrink-0" aria-hidden="true" />
            )}
        </div>
    );
}

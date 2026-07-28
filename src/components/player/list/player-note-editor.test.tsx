import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PlayerNoteForm } from './player-note-editor';

describe('PlayerNoteForm', () => {
    it('개인 운영 메모 안내만 표시하고 관리자 공유 선택은 제공하지 않는다', () => {
        const markup = renderToStaticMarkup(
            <PlayerNoteForm
                draft="개인 참고"
                isDisabled={false}
                isSaving={false}
                message=""
                onChange={vi.fn()}
                onSave={vi.fn()}
            />,
        );

        expect(markup).toContain('나만 보기');
        expect(markup).toContain('현재 로그인한 계정에만 표시됩니다.');
        expect(markup).toContain('개인적으로 참고할 운영 메모를 입력하세요.');
        expect(markup).not.toContain('관리자 공유');
    });
});

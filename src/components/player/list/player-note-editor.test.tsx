import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PlayerNoteForm, PlayerNoteViewer } from './player-note-editor';

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

    it('시트 저장에 통합된 경우 별도 저장 버튼을 표시하지 않는다', () => {
        const markup = renderToStaticMarkup(
            <PlayerNoteForm
                draft="개인 참고"
                isDisabled={false}
                isSaving={false}
                message=""
                onChange={vi.fn()}
            />,
        );

        expect(markup).toContain('개인 참고');
        expect(markup).not.toContain('저장</button>');
    });
});

describe('PlayerNoteViewer', () => {
    it('저장된 메모를 입력 필드와 저장 버튼 없이 표시한다', () => {
        const markup = renderToStaticMarkup(
            <PlayerNoteViewer content="관리자 개인 참고" />,
        );

        expect(markup).toContain('관리자 개인 참고');
        expect(markup).not.toContain('<textarea');
        expect(markup).not.toContain('저장</button>');
        expect(markup).not.toContain('rounded-lg');
    });

    it('메모가 없으면 읽기 전용 빈 상태를 표시한다', () => {
        const markup = renderToStaticMarkup(
            <PlayerNoteViewer content="" />,
        );

        expect(markup).toContain('등록된 개인 운영 메모가 없습니다.');
        expect(markup).not.toContain('<textarea');
    });
});

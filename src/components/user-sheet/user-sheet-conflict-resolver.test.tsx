import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserSheetConflictResolver } from './user-sheet-conflict-resolver';

describe('UserSheetConflictResolver', () => {
    it('수정 전·내 초안·서버 최신값을 비교하고 선택 상태를 안내한다', () => {
        const markup = renderToStaticMarkup(
            <UserSheetConflictResolver
                autoMergedCount={2}
                conflicts={[{
                    id: 'row-1:note',
                    rowId: 'row-1',
                    rowLabel: '상민',
                    field: 'note',
                    fieldLabel: '특이사항',
                    baseValue: '이전 값',
                    draftValue: '내 초안',
                    latestValue: '최신 값',
                }]}
                isApplying={false}
                onApply={vi.fn()}
                onDismiss={vi.fn()}
                onResolve={vi.fn()}
                onResolveAll={vi.fn()}
                resolutions={{}}
            />,
        );

        expect(markup).toContain('다른 관리자의 변경과 겹쳤습니다');
        expect(markup).toContain('수정 전');
        expect(markup).toContain('내 초안');
        expect(markup).toContain('서버 최신값');
        expect(markup).toContain('서로 겹치지 않은 변경 2개');
        expect(markup).toContain('1개 항목의 값을 선택해 주세요.');
    });
});

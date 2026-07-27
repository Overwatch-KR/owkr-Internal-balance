import { MessageSquareText, Pencil, Shield, Swords, UserRound } from 'lucide-react';
import type { UserSheetEntry } from '../../utils/user-sheet';
import { BattleTagCopyButton } from '../player/battle-tag-copy-button';

interface UserSheetEntryViewProps {
    entry: UserSheetEntry;
    isCurrentParticipant: boolean;
    onEdit: () => void;
}

/**
 * @description 선택한 유저의 시트 정보를 읽기 전용 상세 화면으로 보여준다.
 */
export function UserSheetEntryView({
    entry,
    isCurrentParticipant,
    onEdit,
}: UserSheetEntryViewProps) {
    return (
        <section className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 md:p-8" aria-labelledby="user-sheet-entry-title">
            <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            {isCurrentParticipant && (
                                <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[11px] font-medium text-cyan-300">
                                    현재 참가자
                                </span>
                            )}
                            <span className="text-xs text-slate-600">
                                {entry.updatedByName} 수정 · {new Date(entry.updatedAt).toLocaleString('ko-KR')}
                            </span>
                        </div>
                        <h2 id="user-sheet-entry-title" className="text-xl font-semibold text-white">
                            {entry.discordName || entry.battleTag}
                        </h2>
                        <div className="mt-1 flex items-center gap-1">
                            <p className="min-w-0 break-all font-mono text-sm text-slate-400">{entry.battleTag}</p>
                            <BattleTagCopyButton battleTag={entry.battleTag} />
                        </div>
                    </div>
                    <button type="button" onClick={onEdit} className="btn-primary inline-flex min-h-9 items-center gap-2">
                        <Pencil size={14} aria-hidden="true" />
                        시트 수정
                    </button>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                        { label: '탱커', value: entry.tank, icon: Shield },
                        { label: '딜러', value: entry.dps, icon: Swords },
                        { label: '힐러', value: entry.support, icon: UserRound },
                    ].map(item => (
                        <div key={item.label} className="rounded-xl border border-slate-800 bg-surface p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <item.icon size={14} aria-hidden="true" />
                                {item.label}
                            </div>
                            <p className="mt-2 text-base font-semibold text-slate-200">{item.value || '미입력'}</p>
                        </div>
                    ))}
                </div>

                <div className={`mt-4 rounded-xl border p-4 ${
                    entry.note
                        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                        : 'border-slate-800 bg-surface'
                }`}>
                    <div className={`flex items-center gap-2 text-xs ${
                        entry.note ? 'text-emerald-300/80' : 'text-slate-500'
                    }`}>
                        <MessageSquareText size={14} aria-hidden="true" />
                        특이사항
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {entry.note || '등록된 특이사항이 없습니다.'}
                    </p>
                </div>
            </div>
        </section>
    );
}

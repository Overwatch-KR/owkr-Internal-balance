/**
 * @description Discord 관리자 로그인에서 확인하고 이용하는 정보와 목적을 안내한다.
 */
export function DiscordLoginPolicy() {
    return (
        <section
            aria-labelledby="discord-login-policy-title"
            className="mt-5 rounded-lg border border-white/10 bg-slate-950/45 px-4 py-4 text-left text-xs leading-5 text-slate-400 backdrop-blur-xl"
        >
            <h2 id="discord-login-policy-title" className="font-semibold text-slate-200">
                Discord 로그인 정보 이용 안내
            </h2>
            <p className="mt-2">
                등록된 관리자만 접근할 수 있도록 확인하고, 별도 계정 생성 없이 간편하게
                로그인하기 위해 Discord 인증을 사용합니다.
            </p>
            <dl className="mt-3 space-y-2">
                <div>
                    <dt className="font-medium text-slate-300">Discord 사용자 ID</dt>
                    <dd>사전에 등록된 관리자 목록과 대조해 접근 권한을 확인합니다.</dd>
                </div>
                <div>
                    <dt className="font-medium text-slate-300">사용자명 · 표시 이름</dt>
                    <dd>로그인 사용자를 표시하고 유저 시트의 마지막 수정자 이름을 자동으로 기록합니다.</dd>
                </div>
            </dl>
            <p className="mt-3 text-slate-500">
                기본 프로필 확인 권한만 요청하며 이메일, 서버 목록, 멤버 목록, 메시지는 조회하지
                않습니다. OAuth 액세스 토큰은 저장하지 않고 로그인 세션은 8시간 후 만료됩니다.
            </p>
        </section>
    );
}

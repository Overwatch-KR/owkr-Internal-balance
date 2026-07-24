export type GuidePlacement = 'top' | 'right' | 'bottom' | 'left';

interface RectLike {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
}

interface Size {
    width: number;
    height: number;
}

export interface GuideLayout {
    arrowOffset: number;
    panel: {
        left: number;
        top: number;
        width: number;
    };
    placement: GuidePlacement;
    spotlight: RectLike;
}

const VIEWPORT_PADDING = 16;
const TARGET_GAP = 22;
const SPOTLIGHT_PADDING = 8;
const ARROW_EDGE_PADDING = 28;
const DESKTOP_BREAKPOINT = 800;

const clamp = (value: number, minimum: number, maximum: number): number =>
    Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

/**
 * @description 대상과 가이드 크기를 기준으로 서로 겹치지 않는 화면 내 배치를 계산한다.
 */
export const calculateGuideLayout = (
    target: RectLike,
    panel: Size,
    viewport: Size,
): GuideLayout => {
    const panelWidth = Math.min(panel.width, viewport.width - (VIEWPORT_PADDING * 2));
    const panelHeight = Math.min(panel.height, viewport.height - (VIEWPORT_PADDING * 2));
    const spotlight = {
        top: clamp(target.top - SPOTLIGHT_PADDING, 0, viewport.height),
        right: clamp(target.right + SPOTLIGHT_PADDING, 0, viewport.width),
        bottom: clamp(target.bottom + SPOTLIGHT_PADDING, 0, viewport.height),
        left: clamp(target.left - SPOTLIGHT_PADDING, 0, viewport.width),
        width: 0,
        height: 0,
    };
    spotlight.width = Math.max(spotlight.right - spotlight.left, 0);
    spotlight.height = Math.max(spotlight.bottom - spotlight.top, 0);

    const spaces: Record<GuidePlacement, number> = {
        top: target.top - VIEWPORT_PADDING,
        right: viewport.width - target.right - VIEWPORT_PADDING,
        bottom: viewport.height - target.bottom - VIEWPORT_PADDING,
        left: target.left - VIEWPORT_PADDING,
    };
    const required: Record<GuidePlacement, number> = {
        top: panelHeight + TARGET_GAP,
        right: panelWidth + TARGET_GAP,
        bottom: panelHeight + TARGET_GAP,
        left: panelWidth + TARGET_GAP,
    };
    const targetCenterX = target.left + (target.width / 2);
    const targetCenterY = target.top + (target.height / 2);
    const horizontal: GuidePlacement[] = targetCenterX < viewport.width / 2
        ? ['right', 'left']
        : ['left', 'right'];
    const vertical: GuidePlacement[] = spaces.bottom >= spaces.top
        ? ['bottom', 'top']
        : ['top', 'bottom'];
    const candidates = viewport.width >= DESKTOP_BREAKPOINT
        ? [...horizontal, ...vertical]
        : [...vertical, ...horizontal];
    const placement = candidates.find(candidate => spaces[candidate] >= required[candidate])
        ?? candidates.reduce((best, candidate) => (
            spaces[candidate] - required[candidate] > spaces[best] - required[best]
                ? candidate
                : best
        ));

    let left = VIEWPORT_PADDING;
    let top = VIEWPORT_PADDING;
    if (placement === 'right') {
        left = target.right + TARGET_GAP;
        top = targetCenterY - (panelHeight / 2);
    } else if (placement === 'left') {
        left = target.left - panelWidth - TARGET_GAP;
        top = targetCenterY - (panelHeight / 2);
    } else if (placement === 'bottom') {
        left = targetCenterX - (panelWidth / 2);
        top = target.bottom + TARGET_GAP;
    } else {
        left = targetCenterX - (panelWidth / 2);
        top = target.top - panelHeight - TARGET_GAP;
    }

    left = clamp(left, VIEWPORT_PADDING, viewport.width - panelWidth - VIEWPORT_PADDING);
    top = clamp(top, VIEWPORT_PADDING, viewport.height - panelHeight - VIEWPORT_PADDING);

    const arrowOffset = placement === 'left' || placement === 'right'
        ? clamp(targetCenterY - top, ARROW_EDGE_PADDING, panelHeight - ARROW_EDGE_PADDING)
        : clamp(targetCenterX - left, ARROW_EDGE_PADDING, panelWidth - ARROW_EDGE_PADDING);

    return {
        arrowOffset,
        panel: { left, top, width: panelWidth },
        placement,
        spotlight,
    };
};

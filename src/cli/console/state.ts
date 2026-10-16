export type Screen =
	| "results"
	| "review"
	| "detail"
	| "coverage"
	| "manual"
	| "confirm";
export interface ConsoleState {
	screen: Screen;
	back: Screen;
	menu: number;
	group: number;
	occurrence: number;
	scroll: number;
}
export const initialState: ConsoleState = {
	screen: "results",
	back: "results",
	menu: 0,
	group: 0,
	occurrence: 0,
	scroll: 0,
};
export type Navigation =
	| "up"
	| "down"
	| "left"
	| "right"
	| "back"
	| "review"
	| "detail"
	| "coverage"
	| "manual"
	| "confirm";
export function navigate(
	state: ConsoleState,
	key: Navigation,
	counts: number[],
): ConsoleState {
	if (key === "back")
		return {
			...state,
			screen: state.screen === "review" ? "results" : state.back,
			scroll: 0,
		};
	if (["review", "detail", "coverage", "manual", "confirm"].includes(key)) {
		return {
			...state,
			screen: key as Screen,
			back: state.screen === "detail" ? "review" : state.screen,
			scroll: 0,
		};
	}
	const delta = key === "up" || key === "left" ? -1 : 1;
	if (state.screen === "results" && (key === "up" || key === "down"))
		return { ...state, menu: Math.max(0, Math.min(3, state.menu + delta)) };
	if (state.screen === "review" && (key === "up" || key === "down"))
		return {
			...state,
			group: Math.max(
				0,
				Math.min(Math.max(0, counts.length - 1), state.group + delta),
			),
			occurrence: 0,
			scroll: 0,
		};
	if (
		(state.screen === "review" || state.screen === "detail") &&
		(key === "left" || key === "right")
	) {
		const count = counts[state.group] ?? 0;
		return {
			...state,
			occurrence: count ? (state.occurrence + delta + count) % count : 0,
			scroll: 0,
		};
	}
	if (
		["detail", "coverage", "manual", "confirm"].includes(state.screen) &&
		(key === "up" || key === "down")
	)
		return { ...state, scroll: Math.max(0, state.scroll + delta) };
	return state;
}

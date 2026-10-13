import { expect, it } from "vitest";
import {
	type ConsoleState,
	initialState,
	navigate,
} from "../../../src/cli/console/state.js";

it("bounds group/occurrence selection and preserves it across detail/coverage/back", () => {
	let state: ConsoleState = { ...initialState, screen: "review" };
	state = navigate(state, "down", [2, 1]);
	expect(state.group).toBe(1);
	expect(navigate(state, "down", [2, 1]).group).toBe(1);
	state = navigate(state, "up", [2, 1]);
	state = navigate(state, "right", [2, 1]);
	expect(state.occurrence).toBe(1);
	state = navigate(state, "detail", [2, 1]);
	expect(state.screen).toBe("detail");
	state = navigate(state, "down", [2, 1]);
	expect(state.scroll).toBe(1);
	state = navigate(state, "back", [2, 1]);
	expect(state).toMatchObject({
		screen: "review",
		group: 0,
		occurrence: 1,
		scroll: 0,
	});
	expect(navigate(state, "coverage", [2, 1]).screen).toBe("coverage");
	expect(
		navigate(navigate(state, "coverage", [2, 1]), "back", [2, 1]).screen,
	).toBe("review");
});

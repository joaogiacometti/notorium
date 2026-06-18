// Interaction-manager mode ids: "panMode" is registered by the pan plugin,
// "pointerMode" is the interaction manager's built-in default mode that the
// selection plugin enables. The reader's Select/Move toggle and the V/H
// shortcuts activate these modes explicitly rather than going through pan's
// disablePan(), which only returns to whatever the *default* mode is — and the
// pan plugin makes itself the default on touch devices, which would leave the
// Select control unable to reach selection there.
export const PAN_MODE = "panMode";
export const POINTER_MODE = "pointerMode";

export type ReaderInteractionMode = typeof PAN_MODE | typeof POINTER_MODE;

import { ClippyController } from "./clippy-controller.tsx";

export function ClippyGlobalToolbarButton() {
  return (
    <div className="clippy-runtime-mount" aria-hidden="true">
      <ClippyController />
      <span className="clippy-runtime-anchor" />
    </div>
  );
}

const ui = {
  clippy: true
};

export default ui;

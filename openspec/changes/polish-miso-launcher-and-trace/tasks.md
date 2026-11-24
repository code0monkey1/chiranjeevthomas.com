# Tasks

## 1. Ask Miso launcher

- [x] 1.1 Add the orange orbit and cat nudge to the homepage launcher. Verify the full motion at desktop and 360px widths, checking that the text stays legible and the page has no horizontal overflow.
- [x] 1.2 Verify the static accent with reduced motion enabled. Open the dialog with Enter and close it with Escape, then check that focus returns to the launcher and its focus outline is visible.

## 2. Agent Trace

- [x] 2.1 Remove the explanation and duplicate link from the trace pane. Check the empty state on desktop and through the mobile trace toggle, and verify that the header link opens `/projects/miso-chat`.
- [x] 2.2 Submit a suggested question on desktop and mobile. Verify that the answer arrives and the trace pane displays the available steps. Run `npm run eval:chat` for chat regressions.

## 3. Integration

- [ ] 3.1 Run TypeScript checks and review the diff before opening or updating the GitHub PR. Verify both UI changes together on the Netlify deploy preview.

## Workflow follow-up

- Merge the PR into `main` after its checks pass.
- Confirm that Netlify publishes the merge to production, then verify the launcher and trace on the live site.

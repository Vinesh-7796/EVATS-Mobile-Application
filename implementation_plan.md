# Implementation Plan - Phase 1: Foundation Fixes

This plan implements the critical **Phase 1: Foundation Fixes** from the senior engineer review to address architectural, scalability, and UX limitations in the EVATS Mobile proof-of-concept (POC).

## Proposed Changes

### Component 1: Data Architecture & Module Registry
Currently, module data is imported statically, making it impossible to support multiple modules dynamically. We will create a centralized Module Registry.

#### [NEW] [moduleRegistry.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/data/moduleRegistry.ts)
- Define a central registry interface and exported registry object containing metadata, component details, flowchart info, and quiz questions for all modules.
- Initialize `hv-power` as the first fully populated module in this registry.
- Provide helper functions:
  - `getModuleInfo(moduleId: string): FlowchartInfo | undefined`
  - `getModuleComponents(moduleId: string): ComponentDetail[]`
  - `getModuleQuestions(moduleId: string): QuizQuestion[]`
  - `getAllModules(): FlowchartInfo[]`

#### [MODIFY] [home.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/home.tsx)
- Dynamically fetch available modules from `moduleRegistry` instead of importing `hvPowerFlowchart` directly.
- Replace static list of locked modules with a dynamic loop over all modules in the registry.

#### [MODIFY] [progress.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/progress.tsx)
- Dynamically iterate over all modules in the registry to build the completion checklist.

#### [MODIFY] [learn/[moduleId].tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/learn/[moduleId].tsx)
- Read `moduleId` parameter from route.
- Retrieve the corresponding flowchart info and component list dynamically using the registry.

#### [MODIFY] [quiz/[moduleId].tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/quiz/[moduleId].tsx)
- Read `moduleId` parameter from route.
- Dynamically load the correct quiz questions from the registry.

#### [MODIFY] [results.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/results.tsx)
- Retrieve module title from registry using the `moduleId` parameter.

#### [MODIFY] [certificate.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/certificate.tsx)
- Dynamically determine module names and scores for certificate generation from `moduleResults` based on the completed module.

---

### Component 2: Gamification Mechanics & State Persistence

#### [MODIFY] [useProgressStore.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/stores/useProgressStore.ts)
1. **Fix Stale Date Bug**: Remove the module-scoped `const today` variable. Define a dynamic helper `getTodayDateString(): string` that fetches the date string (`YYYY-MM-DD`) at execution time and use it in:
   - Initial state definitions.
   - `completeModule`.
   - `updateStreak`.
2. **Allow Quiz Retakes**: Modify `completeModule` so it does not block updates if a module is already completed.
   - If the new score is higher than the previously stored score for that module, overwrite it.
   - Keep track of the total points calculation correctly to avoid duplicating points on retakes.

---

### Component 3: UX, Styling, and Accessibility

#### [NEW] [useThemedColors.ts](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/hooks/useThemedColors.ts)
- Create a clean custom hook to centralize theme-based color resolution.
- Extract common styling palettes (e.g., card background, primary text, muted text, border colors) so we don't duplicate ternary expressions (`isDark ? '#...' : '#...'`) across screens.

#### [MODIFY] [_layout.tsx (tabs)](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/app/(tabs)/_layout.tsx)
- Replace basic emoji icons (`🏠`, `📊`, `👤`) with proper icons from `@expo/vector-icons` (e.g., using `Ionicons` or `MaterialCommunityIcons`).
- Ensure appropriate `accessibilityLabel` fields are present for tab bar items.

#### [NEW] [ErrorBoundary.tsx](file:///d:/Github/EVATS-Mobile/evats-mobile-poc/src/components/ui/ErrorBoundary.tsx)
- Implement a standard React Error Boundary component to catch rendering crashes (such as flowchart SVG/WebView crashes or web glitches) and display a user-friendly recovery UI instead of crashing the entire app.
- Wrap critical components, particularly `FlowchartViewer` and the main routes.

---

## Open Questions

- **Vector Icons Library**: Is it preferred to use `@expo/vector-icons/Ionicons` or `MaterialCommunityIcons`? (We will default to `Ionicons` for standard cross-platform aesthetics if not specified).
- **Quiz Retake Scoring**: Should we only save the quiz results if the new score is *higher* (Best Effort), or should we always record the *latest* attempt? (Proposed: Save the **highest** score for the certificate, but update the completion date/last activity date to the latest timestamp).

## Verification Plan

### Automated Tests
- Run TypeScript compiler checks:
  ```bash
  npx tsc --noEmit
  ```

### Manual Verification
- **Module Registry**: Verify navigation to `/learn/hv-power` still displays all components correctly. Check that placeholders for other modules are shown on the Home and Progress tabs dynamically.
- **Quiz Retakes**: Complete the quiz once, observe points, then retake the quiz with a different score. Ensure points and grades update correctly and do not double-accumulate.
- **Streak & Date Calculation**: Change simulated device time (or modify AsyncStorage) to verify streak updates and verify that the date logic resolves correctly.
- **Theme Hook**: Toggle between Dark and Light mode and ensure consistency across all screens (except the Certificate screen, which is designed to remain in light theme).
- **Icons**: Verify that tab bar icons render correctly with high resolution and consistent alignment on device.

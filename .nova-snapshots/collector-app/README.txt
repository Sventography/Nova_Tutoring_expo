Nova Tutoring — Economy Phase 1

Files:
- app/_lib/economy.ts
- app/context/StudyProgressContext.tsx
- app/(tabs)/quiz/[topic].tsx

This phase:
- centralizes the 5-coin correct-answer base reward
- adds a progressively harder Nova XP level curve
- preserves daily same-topic practice XP behavior
- fixes quiz -> Island XP calls so reason/meta are passed in the signature IslandContext expects
- does not modify CoinsContext or useLegendaryCompanions

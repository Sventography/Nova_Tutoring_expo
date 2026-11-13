#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import base64
import re
import subprocess
import tempfile
import zipfile

ROOT = Path.cwd()
ISLAND = ROOT / "app/(tabs)/island.tsx"
SCENE = ROOT / "app/components/island3d/NovaIsland3DScene.tsx"
COMPONENT = ROOT / "app/components/island3d/LegendarySatelliteIslands.tsx"
LAYOUT = ROOT / "app/(tabs)/_layout.tsx"
QUIZ = ROOT / "app/(tabs)/quiz/[topic].tsx"
DEV_ROUTES = [
    ROOT / "app/(tabs)/devtest.tsx",
    ROOT / "app/(tabs)/devtest_certificate.tsx",
    ROOT / "app/(tabs)/devtest_quizwire.tsx",
]

COMPONENT_SOURCE = base64.b64decode("Ly8gYXBwL2NvbXBvbmVudHMvaXNsYW5kM2QvTGVnZW5kYXJ5U2F0ZWxsaXRlSXNsYW5kcy50c3gKCmltcG9ydCBSZWFjdCwgeyB1c2VNZW1vLCB1c2VSZWYgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7IHVzZUZyYW1lIH0gZnJvbSAiQHJlYWN0LXRocmVlL2ZpYmVyL25hdGl2ZSI7CmltcG9ydCAqIGFzIFRIUkVFIGZyb20gInRocmVlIjsKCnR5cGUgVmVjMyA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTsKCnR5cGUgUHJvcHMgPSB7CiAgb3duZWRDb21wYW5pb25JZHM/OiBzdHJpbmdbXTsKfTsKCnR5cGUgU2F0ZWxsaXRlU2hlbGxQcm9wcyA9IHsKICBwb3NpdGlvbjogVmVjMzsKICBhY2NlbnQ6IHN0cmluZzsKICBjaGlsZHJlbjogUmVhY3QuUmVhY3ROb2RlOwp9OwoKLyoKICogU2l4IHNlcGFyYXRlIHNhdGVsbGl0ZSBpc2xhbmRzIHNpdCBvbiBhIDcuMi11bml0IHBlcmltZXRlciByaW5nLgogKiBFdmVyeSBzYXRlbGxpdGUgaGFzIGEgZm9vdHByaW50IHJhZGl1cyBiZWxvdyAwLjg1IHVuaXRzLgogKiBUaGUgY2xvc2VzdCBzYXRlbGxpdGUgaXMgbW9yZSB0aGFuIDIuNCB1bml0cyBmcm9tIGFuIGV4aXN0aW5nIGxhbmRtYXJrLAogKiBhbmQgbmVpZ2hib3Jpbmcgc2F0ZWxsaXRlcyBhcmUgbW9yZSB0aGFuIDcgdW5pdHMgYXBhcnQuCiAqCiAqIFJlc3VsdDogdGhlIGxlZ2VuZGFyeSBhZGRpdGlvbnMgY2Fubm90IGNvdmVyIG9uZSBhbm90aGVyIG9yIGFueSBleGlzdGluZwogKiBpc2xhbmQgbGFuZG1hcmsuIFRoZXkgcmVtYWluIHZpc3VhbGx5IGNvbm5lY3RlZCB0byBOb3ZhIElzbGFuZCB3aXRob3V0CiAqIHJlcGxhY2luZyBvciBoaWRpbmcgdGhlIExpYnJhcnksIE1vb253ZWxsLCBPYnNlcnZhdG9yeSwgRmFsbHMsIFRlbXBsZSwKICogQ3J5c3RhbCBXaWxkcywgTm92YSdzIHBlZGVzdGFsLCBvciBhbnkgZnJpZW5kc2hpcCBkaXNjb3ZlcnkuCiAqLwpleHBvcnQgY29uc3QgTEVHRU5EQVJZX1NBVEVMTElURV9QT1NJVElPTlMgPSB7CiAgbWVjaGFPd2w6IFs2LjQyLCAxLjAsIDMuMjddIGFzIFZlYzMsCiAgY2hyb25vRm94OiBbMC4zOCwgMS4wOCwgNy4xOV0gYXMgVmVjMywKICBheG9sb3RsT3JhY2xlOiBbLTYuMDMsIDAuOTYsIDMuOTJdIGFzIFZlYzMsCiAgYXN0cmFsTm92YTogWy02LjQyLCAxLjA0LCAtMy4yN10gYXMgVmVjMywKICBjZWxlc3RyYTogWy0wLjM4LCAxLjE4LCAtNy4xOV0gYXMgVmVjMywKICBhZXRoZXJ3eXJtOiBbNi4wMywgMS4yMiwgLTMuOTJdIGFzIFZlYzMsCn0gYXMgY29uc3Q7CgpmdW5jdGlvbiBub3JtYWxpemVUb2tlbih2YWx1ZTogdW5rbm93bik6IHN0cmluZyB7CiAgcmV0dXJuIFN0cmluZyh2YWx1ZSA/PyAiIikKICAgIC50cmltKCkKICAgIC50b0xvd2VyQ2FzZSgpCiAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAiIik7Cn0KCmZ1bmN0aW9uIG93bnNUb2tlbih0b2tlbnM6IHN0cmluZ1tdLCB0b2tlbjogc3RyaW5nKTogYm9vbGVhbiB7CiAgcmV0dXJuIHRva2Vucy5zb21lKCh2YWx1ZSkgPT4gdmFsdWUuaW5jbHVkZXModG9rZW4pKTsKfQoKZnVuY3Rpb24gU2F0ZWxsaXRlU2hlbGwoewogIHBvc2l0aW9uLAogIGFjY2VudCwKICBjaGlsZHJlbiwKfTogU2F0ZWxsaXRlU2hlbGxQcm9wcykgewogIGNvbnN0IGhhbG9SZWYgPSB1c2VSZWY8VEhSRUUuTWVzaD4obnVsbCk7CgogIHVzZUZyYW1lKChfLCBkZWx0YSkgPT4gewogICAgaWYgKGhhbG9SZWYuY3VycmVudCkgewogICAgICBoYWxvUmVmLmN1cnJlbnQucm90YXRpb24ueiArPSBkZWx0YSAqIDAuMTQ7CiAgICB9CiAgfSk7CgogIHJldHVybiAoCiAgICA8Z3JvdXAgcG9zaXRpb249e3Bvc2l0aW9ufT4KICAgICAgPHBvaW50TGlnaHQgY29sb3I9e2FjY2VudH0gaW50ZW5zaXR5PXswLjUyfSBkaXN0YW5jZT17NC4yfSAvPgoKICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAtMC41NSwgMF19IHJvdGF0aW9uPXtbTWF0aC5QSSwgMCwgMF19PgogICAgICAgIDxjb25lR2VvbWV0cnkgYXJncz17WzAuODIsIDEuNTUsIDldfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiMyOTMyNDciCiAgICAgICAgICByb3VnaG5lc3M9ezAuODJ9CiAgICAgICAgICBtZXRhbG5lc3M9ezAuMDh9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAwLjE4LCAwXX0+CiAgICAgICAgPGN5bGluZGVyR2VvbWV0cnkgYXJncz17WzAuODQsIDAuNzgsIDAuMiwgMThdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiMyZjhkNWEiCiAgICAgICAgICByb3VnaG5lc3M9ezAuNzh9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPG1lc2gKICAgICAgICByZWY9e2hhbG9SZWZ9CiAgICAgICAgcG9zaXRpb249e1swLCAwLjIyLCAwXX0KICAgICAgICByb3RhdGlvbj17W01hdGguUEkgLyAyLCAwLCAwXX0KICAgICAgPgogICAgICAgIDx0b3J1c0dlb21ldHJ5IGFyZ3M9e1swLjcyLCAwLjAyMiwgOCwgNDBdfSAvPgogICAgICAgIDxtZXNoQmFzaWNNYXRlcmlhbAogICAgICAgICAgY29sb3I9e2FjY2VudH0KICAgICAgICAgIHRyYW5zcGFyZW50CiAgICAgICAgICBvcGFjaXR5PXswLjQyfQogICAgICAgICAgZGVwdGhXcml0ZT17ZmFsc2V9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAtMS4xLCAwXX0gc2NhbGU9ezEuNX0+CiAgICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1swLjUyLCAxMiwgMTBdfSAvPgogICAgICAgIDxtZXNoQmFzaWNNYXRlcmlhbAogICAgICAgICAgY29sb3I9e2FjY2VudH0KICAgICAgICAgIHRyYW5zcGFyZW50CiAgICAgICAgICBvcGFjaXR5PXswLjA0fQogICAgICAgICAgZGVwdGhXcml0ZT17ZmFsc2V9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPGdyb3VwIHBvc2l0aW9uPXtbMCwgMC4zLCAwXX0+e2NoaWxkcmVufTwvZ3JvdXA+CiAgICA8L2dyb3VwPgogICk7Cn0KCmZ1bmN0aW9uIE1lY2hhT3dsU2F0ZWxsaXRlKCkgewogIGNvbnN0IGdlYXJSZWYgPSB1c2VSZWY8VEhSRUUuTWVzaD4obnVsbCk7CiAgY29uc3Qgb3dsUmVmID0gdXNlUmVmPFRIUkVFLkdyb3VwPihudWxsKTsKCiAgdXNlRnJhbWUoKHsgY2xvY2sgfSwgZGVsdGEpID0+IHsKICAgIGlmIChnZWFyUmVmLmN1cnJlbnQpIHsKICAgICAgZ2VhclJlZi5jdXJyZW50LnJvdGF0aW9uLnogKz0gZGVsdGEgKiAwLjg7CiAgICB9CgogICAgaWYgKG93bFJlZi5jdXJyZW50KSB7CiAgICAgIG93bFJlZi5jdXJyZW50LnBvc2l0aW9uLnkgPQogICAgICAgIDAuNjggKyBNYXRoLnNpbihjbG9jay5lbGFwc2VkVGltZSAqIDEuOCkgKiAwLjAzNTsKICAgIH0KICB9KTsKCiAgcmV0dXJuICgKICAgIDxTYXRlbGxpdGVTaGVsbAogICAgICBwb3NpdGlvbj17TEVHRU5EQVJZX1NBVEVMTElURV9QT1NJVElPTlMubWVjaGFPd2x9CiAgICAgIGFjY2VudD0iIzIyZDNlZSIKICAgID4KICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAwLjE4LCAwXX0+CiAgICAgICAgPGN5bGluZGVyR2VvbWV0cnkgYXJncz17WzAuMjQsIDAuMzQsIDAuMzgsIDEwXX0gLz4KICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgIGNvbG9yPSIjNDY1NjZmIgogICAgICAgICAgbWV0YWxuZXNzPXswLjc4fQogICAgICAgICAgcm91Z2huZXNzPXswLjI4fQogICAgICAgIC8+CiAgICAgIDwvbWVzaD4KCiAgICAgIDxtZXNoIHJlZj17Z2VhclJlZn0gcG9zaXRpb249e1swLCAwLjU1LCAtMC4wOF19PgogICAgICAgIDx0b3J1c0dlb21ldHJ5IGFyZ3M9e1swLjQ2LCAwLjA1NSwgOCwgMjRdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiM2N2U4ZjkiCiAgICAgICAgICBlbWlzc2l2ZT0iIzA4OTFiMiIKICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjd9CiAgICAgICAgICBtZXRhbG5lc3M9ezAuNzJ9CiAgICAgICAgICByb3VnaG5lc3M9ezAuMjJ9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPGdyb3VwIHJlZj17b3dsUmVmfSBwb3NpdGlvbj17WzAsIDAuNjgsIDAuMDhdfSBzY2FsZT17MC43Mn0+CiAgICAgICAgPG1lc2ggc2NhbGU9e1swLjQyLCAwLjUyLCAwLjM0XX0+CiAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzAuNTUsIDE2LCAxMl19IC8+CiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgY29sb3I9IiMyNjM0NDkiCiAgICAgICAgICAgIG1ldGFsbmVzcz17MC44Mn0KICAgICAgICAgICAgcm91Z2huZXNzPXswLjI2fQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CgogICAgICAgIDxtZXNoIHBvc2l0aW9uPXtbMCwgMC4zOCwgMC4wM119IHNjYWxlPXtbMC41MiwgMC40MiwgMC40XX0+CiAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzAuNTIsIDE2LCAxMl19IC8+CiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgY29sb3I9IiM2NDc0OGIiCiAgICAgICAgICAgIG1ldGFsbmVzcz17MC42OH0KICAgICAgICAgICAgcm91Z2huZXNzPXswLjI2fQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CgogICAgICAgIHtbLTEsIDFdLm1hcCgoc2lkZSkgPT4gKAogICAgICAgICAgPG1lc2gKICAgICAgICAgICAga2V5PXtzaWRlfQogICAgICAgICAgICBwb3NpdGlvbj17W3NpZGUgKiAwLjI1LCAwLjQsIDAuMzddfQogICAgICAgICAgICBzY2FsZT17WzAuMDksIDAuMDksIDAuMDZdfQogICAgICAgICAgPgogICAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDEyLCAxMF19IC8+CiAgICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgICAgIGNvbG9yPSIjZmRlMDQ3IgogICAgICAgICAgICAgIGVtaXNzaXZlPSIjZmFjYzE1IgogICAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXszfQogICAgICAgICAgICAvPgogICAgICAgICAgPC9tZXNoPgogICAgICAgICkpfQoKICAgICAgICB7Wy0xLCAxXS5tYXAoKHNpZGUpID0+ICgKICAgICAgICAgIDxtZXNoCiAgICAgICAgICAgIGtleT17YHdpbmctJHtzaWRlfWB9CiAgICAgICAgICAgIHBvc2l0aW9uPXtbc2lkZSAqIDAuMzQsIDAuMDIsIC0wLjAxXX0KICAgICAgICAgICAgcm90YXRpb249e1swLCAwLCBzaWRlICogMC41NV19CiAgICAgICAgICAgIHNjYWxlPXtbMC4xNCwgMC40NCwgMC4yMl19CiAgICAgICAgICA+CiAgICAgICAgICAgIDxzcGhlcmVHZW9tZXRyeSBhcmdzPXtbMSwgMTIsIDEwXX0gLz4KICAgICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICAgICAgY29sb3I9IiMxZTI5M2IiCiAgICAgICAgICAgICAgbWV0YWxuZXNzPXswLjh9CiAgICAgICAgICAgICAgcm91Z2huZXNzPXswLjN9CiAgICAgICAgICAgIC8+CiAgICAgICAgICA8L21lc2g+CiAgICAgICAgKSl9CiAgICAgIDwvZ3JvdXA+CiAgICA8L1NhdGVsbGl0ZVNoZWxsPgogICk7Cn0KCmZ1bmN0aW9uIENocm9ub0ZveFNhdGVsbGl0ZSgpIHsKICBjb25zdCBvdXRlclJlZiA9IHVzZVJlZjxUSFJFRS5NZXNoPihudWxsKTsKICBjb25zdCBpbm5lclJlZiA9IHVzZVJlZjxUSFJFRS5NZXNoPihudWxsKTsKICBjb25zdCBjcnlzdGFsUmVmID0gdXNlUmVmPFRIUkVFLkdyb3VwPihudWxsKTsKCiAgdXNlRnJhbWUoKHsgY2xvY2sgfSwgZGVsdGEpID0+IHsKICAgIGlmIChvdXRlclJlZi5jdXJyZW50KSB7CiAgICAgIG91dGVyUmVmLmN1cnJlbnQucm90YXRpb24ueSArPSBkZWx0YSAqIDAuNTI7CiAgICAgIG91dGVyUmVmLmN1cnJlbnQucm90YXRpb24ueCA9CiAgICAgICAgMC4zOCArIE1hdGguc2luKGNsb2NrLmVsYXBzZWRUaW1lICogMC43KSAqIDAuMDg7CiAgICB9CgogICAgaWYgKGlubmVyUmVmLmN1cnJlbnQpIHsKICAgICAgaW5uZXJSZWYuY3VycmVudC5yb3RhdGlvbi55IC09IGRlbHRhICogMC43NjsKICAgICAgaW5uZXJSZWYuY3VycmVudC5yb3RhdGlvbi56ICs9IGRlbHRhICogMC4yNDsKICAgIH0KCiAgICBpZiAoY3J5c3RhbFJlZi5jdXJyZW50KSB7CiAgICAgIGNyeXN0YWxSZWYuY3VycmVudC5wb3NpdGlvbi55ID0KICAgICAgICAwLjcgKyBNYXRoLnNpbihjbG9jay5lbGFwc2VkVGltZSAqIDEuNSkgKiAwLjA2OwogICAgfQogIH0pOwoKICByZXR1cm4gKAogICAgPFNhdGVsbGl0ZVNoZWxsCiAgICAgIHBvc2l0aW9uPXtMRUdFTkRBUllfU0FURUxMSVRFX1BPU0lUSU9OUy5jaHJvbm9Gb3h9CiAgICAgIGFjY2VudD0iI2Y1OWUwYiIKICAgID4KICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAwLjEyLCAwXX0+CiAgICAgICAgPGN5bGluZGVyR2VvbWV0cnkgYXJncz17WzAuMzEsIDAuNCwgMC4yNSwgMTJdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbCBjb2xvcj0iIzdjNGEyMCIgbWV0YWxuZXNzPXswLjU4fSAvPgogICAgICA8L21lc2g+CgogICAgICA8bWVzaCByZWY9e291dGVyUmVmfSBwb3NpdGlvbj17WzAsIDAuNzIsIDBdfSByb3RhdGlvbj17WzAuMzUsIDAsIDAuMl19PgogICAgICAgIDx0b3J1c0dlb21ldHJ5IGFyZ3M9e1swLjUsIDAuMDM1LCA4LCAzNl19IC8+CiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICBjb2xvcj0iI2Y1OWUwYiIKICAgICAgICAgIGVtaXNzaXZlPSIjZjU5ZTBiIgogICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9ezJ9CiAgICAgICAgICBtZXRhbG5lc3M9ezAuNzJ9CiAgICAgICAgICByb3VnaG5lc3M9ezAuMTh9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPG1lc2ggcmVmPXtpbm5lclJlZn0gcG9zaXRpb249e1swLCAwLjcyLCAwXX0gcm90YXRpb249e1tNYXRoLlBJIC8gMiwgMCwgMF19PgogICAgICAgIDx0b3J1c0dlb21ldHJ5IGFyZ3M9e1swLjMyLCAwLjAyNiwgOCwgMzJdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiNmZGU2OGEiCiAgICAgICAgICBlbWlzc2l2ZT0iI2ZiYmYyNCIKICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjh9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAgPGdyb3VwIHJlZj17Y3J5c3RhbFJlZn0gcG9zaXRpb249e1swLCAwLjcsIDBdfT4KICAgICAgICA8bWVzaCBwb3NpdGlvbj17WzAsIDAuMTIsIDBdfT4KICAgICAgICAgIDxvY3RhaGVkcm9uR2VvbWV0cnkgYXJncz17WzAuMiwgMF19IC8+CiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgY29sb3I9IiNmZWYzYzciCiAgICAgICAgICAgIGVtaXNzaXZlPSIjZjU5ZTBiIgogICAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17Mi4yfQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CiAgICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAtMC4xNiwgMF19IHJvdGF0aW9uPXtbTWF0aC5QSSwgMCwgMF19PgogICAgICAgICAgPGNvbmVHZW9tZXRyeSBhcmdzPXtbMC4xMywgMC4yOCwgNl19IC8+CiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgY29sb3I9IiNmYjkyM2MiCiAgICAgICAgICAgIGVtaXNzaXZlPSIjZjU5ZTBiIgogICAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17MS40fQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CiAgICAgIDwvZ3JvdXA+CiAgICA8L1NhdGVsbGl0ZVNoZWxsPgogICk7Cn0KCmZ1bmN0aW9uIEF4b2xvdGxPcmFjbGVTYXRlbGxpdGUoKSB7CiAgY29uc3QgYnViYmxlUmVmID0gdXNlUmVmPFRIUkVFLkdyb3VwPihudWxsKTsKICBjb25zdCBwb29sUmVmID0gdXNlUmVmPFRIUkVFLk1lc2g+KG51bGwpOwoKICB1c2VGcmFtZSgoeyBjbG9jayB9LCBkZWx0YSkgPT4gewogICAgaWYgKGJ1YmJsZVJlZi5jdXJyZW50KSB7CiAgICAgIGJ1YmJsZVJlZi5jdXJyZW50LnJvdGF0aW9uLnkgKz0gZGVsdGEgKiAwLjIyOwogICAgICBidWJibGVSZWYuY3VycmVudC5wb3NpdGlvbi55ID0KICAgICAgICAwLjI0ICsgTWF0aC5zaW4oY2xvY2suZWxhcHNlZFRpbWUgKiAxLjI1KSAqIDAuMDQ7CiAgICB9CgogICAgaWYgKHBvb2xSZWYuY3VycmVudCkgewogICAgICBjb25zdCBwdWxzZSA9IDEgKyBNYXRoLnNpbihjbG9jay5lbGFwc2VkVGltZSAqIDEuMSkgKiAwLjAyNTsKICAgICAgcG9vbFJlZi5jdXJyZW50LnNjYWxlLnNldChwdWxzZSwgMSwgMiAtIHB1bHNlKTsKICAgIH0KICB9KTsKCiAgcmV0dXJuICgKICAgIDxTYXRlbGxpdGVTaGVsbAogICAgICBwb3NpdGlvbj17TEVHRU5EQVJZX1NBVEVMTElURV9QT1NJVElPTlMuYXhvbG90bE9yYWNsZX0KICAgICAgYWNjZW50PSIjNjBhNWZhIgogICAgPgogICAgICA8bWVzaCBwb3NpdGlvbj17WzAsIDAuMTMsIDBdfSByb3RhdGlvbj17W01hdGguUEkgLyAyLCAwLCAwXX0+CiAgICAgICAgPHRvcnVzR2VvbWV0cnkgYXJncz17WzAuNDgsIDAuMSwgMTAsIDM2XX0gLz4KICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9IiM2NDc0OGIiIHJvdWdobmVzcz17MC43NX0gLz4KICAgICAgPC9tZXNoPgoKICAgICAgPG1lc2ggcmVmPXtwb29sUmVmfSBwb3NpdGlvbj17WzAsIDAuMTUsIDBdfT4KICAgICAgICA8Y3lsaW5kZXJHZW9tZXRyeSBhcmdzPXtbMC40NiwgMC40NiwgMC4wNywgMzJdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiMzOGJkZjgiCiAgICAgICAgICBlbWlzc2l2ZT0iIzBlYTVlOSIKICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjF9CiAgICAgICAgICB0cmFuc3BhcmVudAogICAgICAgICAgb3BhY2l0eT17MC44Mn0KICAgICAgICAgIHJvdWdobmVzcz17MC4xNX0KICAgICAgICAvPgogICAgICA8L21lc2g+CgogICAgICA8Z3JvdXAgcG9zaXRpb249e1swLCAwLjU1LCAwLjAyXX0gc2NhbGU9ezAuNzZ9PgogICAgICAgIDxtZXNoIHNjYWxlPXtbMC41LCAwLjM2LCAwLjQyXX0+CiAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzAuNTUsIDE2LCAxMl19IC8+CiAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgY29sb3I9IiNmMGFiZmMiCiAgICAgICAgICAgIGVtaXNzaXZlPSIjYzAyNmQzIgogICAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17MC40NX0KICAgICAgICAgIC8+CiAgICAgICAgPC9tZXNoPgoKICAgICAgICB7Wy0xLCAxXS5tYXAoKHNpZGUpID0+CiAgICAgICAgICBbLTEsIDAsIDFdLm1hcCgoYnJhbmNoKSA9PiAoCiAgICAgICAgICAgIDxtZXNoCiAgICAgICAgICAgICAga2V5PXtgJHtzaWRlfS0ke2JyYW5jaH1gfQogICAgICAgICAgICAgIHBvc2l0aW9uPXtbc2lkZSAqIDAuMzQsIGJyYW5jaCAqIDAuMTEsIDBdfQogICAgICAgICAgICAgIHJvdGF0aW9uPXtbMCwgMCwgc2lkZSAqICgwLjcgKyBicmFuY2ggKiAwLjIpXX0KICAgICAgICAgICAgPgogICAgICAgICAgICAgIDxjeWxpbmRlckdlb21ldHJ5IGFyZ3M9e1swLjAyNSwgMC4wMzUsIDAuMjQsIDZdfSAvPgogICAgICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgICAgICAgY29sb3I9IiNmNWQwZmUiCiAgICAgICAgICAgICAgICBlbWlzc2l2ZT0iI2U4NzlmOSIKICAgICAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjJ9CiAgICAgICAgICAgICAgLz4KICAgICAgICAgICAgPC9tZXNoPgogICAgICAgICAgKSkKICAgICAgICApfQoKICAgICAgICB7Wy0xLCAxXS5tYXAoKHNpZGUpID0+ICgKICAgICAgICAgIDxtZXNoIGtleT17c2lkZX0gcG9zaXRpb249e1tzaWRlICogMC4xNiwgMC4wNSwgMC4zNl19IHNjYWxlPXswLjA1NX0+CiAgICAgICAgICAgIDxzcGhlcmVHZW9tZXRyeSBhcmdzPXtbMSwgMTAsIDhdfSAvPgogICAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwgY29sb3I9IiMxMTE4MjciIC8+CiAgICAgICAgICA8L21lc2g+CiAgICAgICAgKSl9CiAgICAgIDwvZ3JvdXA+CgogICAgICA8Z3JvdXAgcmVmPXtidWJibGVSZWZ9IHBvc2l0aW9uPXtbMCwgMC4yNCwgMF19PgogICAgICAgIHtbCiAgICAgICAgICBbLTAuMzgsIDAuMiwgMC4xOCwgMC4wNV0sCiAgICAgICAgICBbMC4zMiwgMC4zNCwgMC4wOCwgMC4wN10sCiAgICAgICAgICBbMC4wOCwgMC41LCAtMC4zLCAwLjA0NV0sCiAgICAgICAgXS5tYXAoKFt4LCB5LCB6LCBzaXplXSwgaW5kZXgpID0+ICgKICAgICAgICAgIDxtZXNoIGtleT17aW5kZXh9IHBvc2l0aW9uPXtbeCwgeSwgel19IHNjYWxlPXtzaXplfT4KICAgICAgICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1sxLCAxMCwgOF19IC8+CiAgICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgICAgIGNvbG9yPSIjZGJlYWZlIgogICAgICAgICAgICAgIGVtaXNzaXZlPSIjNjBhNWZhIgogICAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjV9CiAgICAgICAgICAgICAgdHJhbnNwYXJlbnQKICAgICAgICAgICAgICBvcGFjaXR5PXswLjd9CiAgICAgICAgICAgIC8+CiAgICAgICAgICA8L21lc2g+CiAgICAgICAgKSl9CiAgICAgIDwvZ3JvdXA+CiAgICA8L1NhdGVsbGl0ZVNoZWxsPgogICk7Cn0KCmZ1bmN0aW9uIEFzdHJhbE5vdmFTYXRlbGxpdGUoKSB7CiAgY29uc3Qgb3JiaXRSZWYgPSB1c2VSZWY8VEhSRUUuR3JvdXA+KG51bGwpOwoKICB1c2VGcmFtZSgoeyBjbG9jayB9LCBkZWx0YSkgPT4gewogICAgaWYgKG9yYml0UmVmLmN1cnJlbnQpIHsKICAgICAgb3JiaXRSZWYuY3VycmVudC5yb3RhdGlvbi55ICs9IGRlbHRhICogMC4xODsKICAgICAgb3JiaXRSZWYuY3VycmVudC5wb3NpdGlvbi55ID0KICAgICAgICAwLjYyICsgTWF0aC5zaW4oY2xvY2suZWxhcHNlZFRpbWUgKiAxLjE1KSAqIDAuMDM1OwogICAgfQogIH0pOwoKICBjb25zdCBmbG93ZXJzID0gdXNlTWVtbzxWZWMzW10+KAogICAgKCkgPT4gWwogICAgICBbLTAuNDIsIDAsIC0wLjJdLAogICAgICBbLTAuMjIsIDAsIDAuMzVdLAogICAgICBbMC4xMiwgMCwgLTAuMzZdLAogICAgICBbMC40MiwgMCwgMC4xOF0sCiAgICBdLAogICAgW10KICApOwoKICByZXR1cm4gKAogICAgPFNhdGVsbGl0ZVNoZWxsCiAgICAgIHBvc2l0aW9uPXtMRUdFTkRBUllfU0FURUxMSVRFX1BPU0lUSU9OUy5hc3RyYWxOb3ZhfQogICAgICBhY2NlbnQ9IiNlODc5ZjkiCiAgICA+CiAgICAgIHtmbG93ZXJzLm1hcCgoW3gsIHksIHpdLCBpbmRleCkgPT4gKAogICAgICAgIDxncm91cCBrZXk9e2luZGV4fSBwb3NpdGlvbj17W3gsIHkgKyAwLjE1LCB6XX0+CiAgICAgICAgICA8bWVzaCBwb3NpdGlvbj17WzAsIDAuMTUsIDBdfT4KICAgICAgICAgICAgPGN5bGluZGVyR2VvbWV0cnkgYXJncz17WzAuMDE1LCAwLjAyMiwgMC4zLCA2XX0gLz4KICAgICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsIGNvbG9yPSIjNjVhMzBkIiAvPgogICAgICAgICAgPC9tZXNoPgogICAgICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAwLjMzLCAwXX0gcm90YXRpb249e1swLCBpbmRleCAqIDAuNywgMF19PgogICAgICAgICAgICA8b2N0YWhlZHJvbkdlb21ldHJ5IGFyZ3M9e1swLjA5LCAwXX0gLz4KICAgICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICAgICAgY29sb3I9e2luZGV4ICUgMiA/ICIjZmRlMDQ3IiA6ICIjZjBhYmZjIn0KICAgICAgICAgICAgICBlbWlzc2l2ZT17aW5kZXggJSAyID8gIiNmYWNjMTUiIDogIiNkOTQ2ZWYifQogICAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjh9CiAgICAgICAgICAgIC8+CiAgICAgICAgICA8L21lc2g+CiAgICAgICAgPC9ncm91cD4KICAgICAgKSl9CgogICAgICA8Z3JvdXAgcmVmPXtvcmJpdFJlZn0gcG9zaXRpb249e1swLCAwLjYyLCAwXX0+CiAgICAgICAge1swLCAxLCAyXS5tYXAoKGluZGV4KSA9PiB7CiAgICAgICAgICBjb25zdCBhbmdsZSA9IChpbmRleCAvIDMpICogTWF0aC5QSSAqIDI7CiAgICAgICAgICByZXR1cm4gKAogICAgICAgICAgICA8bWVzaAogICAgICAgICAgICAgIGtleT17aW5kZXh9CiAgICAgICAgICAgICAgcG9zaXRpb249e1sKICAgICAgICAgICAgICAgIE1hdGguY29zKGFuZ2xlKSAqIDAuNDUsCiAgICAgICAgICAgICAgICBpbmRleCAqIDAuMDgsCiAgICAgICAgICAgICAgICBNYXRoLnNpbihhbmdsZSkgKiAwLjQ1LAogICAgICAgICAgICAgIF19CiAgICAgICAgICAgICAgc2NhbGU9e2luZGV4ID09PSAxID8gMC4xIDogMC4wNzV9CiAgICAgICAgICAgID4KICAgICAgICAgICAgICA8b2N0YWhlZHJvbkdlb21ldHJ5IGFyZ3M9e1sxLCAwXX0gLz4KICAgICAgICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgICAgICAgIGNvbG9yPSIjZmZmZmZmIgogICAgICAgICAgICAgICAgZW1pc3NpdmU9e2luZGV4ID09PSAxID8gIiNmYWNjMTUiIDogIiNkOTQ2ZWYifQogICAgICAgICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9ezIuNn0KICAgICAgICAgICAgICAvPgogICAgICAgICAgICA8L21lc2g+CiAgICAgICAgICApOwogICAgICAgIH0pfQogICAgICA8L2dyb3VwPgoKICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAwLjQ0LCAwXX0gc2NhbGU9e1swLjIyLCAwLjI4LCAwLjE4XX0+CiAgICAgICAgPHNwaGVyZUdlb21ldHJ5IGFyZ3M9e1sxLCAxNCwgMTBdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiNmNWQwZmUiCiAgICAgICAgICBlbWlzc2l2ZT0iI2E4NTVmNyIKICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXswLjl9CiAgICAgICAgLz4KICAgICAgPC9tZXNoPgoKICAgICAge1stMSwgMV0ubWFwKChzaWRlKSA9PiAoCiAgICAgICAgPG1lc2gKICAgICAgICAgIGtleT17c2lkZX0KICAgICAgICAgIHBvc2l0aW9uPXtbc2lkZSAqIDAuMSwgMC43MiwgMF19CiAgICAgICAgICBzY2FsZT17WzAuMDcsIDAuMjIsIDAuMDddfQogICAgICAgICAgcm90YXRpb249e1swLCAwLCBzaWRlICogMC4xXX0KICAgICAgICA+CiAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDEyLCA5XX0gLz4KICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgICBjb2xvcj0iI2Y1ZDBmZSIKICAgICAgICAgICAgZW1pc3NpdmU9IiNhODU1ZjciCiAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXswLjc1fQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CiAgICAgICkpfQogICAgPC9TYXRlbGxpdGVTaGVsbD4KICApOwp9CgpmdW5jdGlvbiBDZWxlc3RyYVNhdGVsbGl0ZSgpIHsKICBjb25zdCBzdGFyc1JlZiA9IHVzZVJlZjxUSFJFRS5Hcm91cD4obnVsbCk7CgogIHVzZUZyYW1lKCh7IGNsb2NrIH0sIGRlbHRhKSA9PiB7CiAgICBpZiAoc3RhcnNSZWYuY3VycmVudCkgewogICAgICBzdGFyc1JlZi5jdXJyZW50LnJvdGF0aW9uLnkgKz0gZGVsdGEgKiAwLjI7CiAgICAgIHN0YXJzUmVmLmN1cnJlbnQucm90YXRpb24ueiA9CiAgICAgICAgTWF0aC5zaW4oY2xvY2suZWxhcHNlZFRpbWUgKiAwLjYpICogMC4wNzsKICAgIH0KICB9KTsKCiAgcmV0dXJuICgKICAgIDxTYXRlbGxpdGVTaGVsbAogICAgICBwb3NpdGlvbj17TEVHRU5EQVJZX1NBVEVMTElURV9QT1NJVElPTlMuY2VsZXN0cmF9CiAgICAgIGFjY2VudD0iI2E3OGJmYSIKICAgID4KICAgICAge1stMC40MiwgMC40Ml0ubWFwKCh4KSA9PiAoCiAgICAgICAgPG1lc2gga2V5PXt4fSBwb3NpdGlvbj17W3gsIDAuNjIsIDBdfT4KICAgICAgICAgIDxjeWxpbmRlckdlb21ldHJ5IGFyZ3M9e1swLjA3LCAwLjExLCAxLjA1LCA5XX0gLz4KICAgICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgICBjb2xvcj0iI2UyZThmMCIKICAgICAgICAgICAgZW1pc3NpdmU9IiM4MThjZjgiCiAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXswLjM1fQogICAgICAgICAgLz4KICAgICAgICA8L21lc2g+CiAgICAgICkpfQoKICAgICAgPG1lc2ggcG9zaXRpb249e1swLCAxLjAyLCAwXX0gcm90YXRpb249e1swLCAwLCBNYXRoLlBJXX0+CiAgICAgICAgPHRvcnVzR2VvbWV0cnkgYXJncz17WzAuNDUsIDAuMDc1LCA5LCAyOCwgTWF0aC5QSV19IC8+CiAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICBjb2xvcj0iI2RkZDZmZSIKICAgICAgICAgIGVtaXNzaXZlPSIjOGI1Y2Y2IgogICAgICAgICAgZW1pc3NpdmVJbnRlbnNpdHk9ezAuOX0KICAgICAgICAvPgogICAgICA8L21lc2g+CgogICAgICA8Z3JvdXAgcmVmPXtzdGFyc1JlZn0gcG9zaXRpb249e1swLCAwLjgyLCAtMC4wNF19PgogICAgICAgIHtbCiAgICAgICAgICBbLTAuMjQsIDAuMDYsIDBdLAogICAgICAgICAgWzAsIDAuMjUsIDBdLAogICAgICAgICAgWzAuMjQsIDAuMDIsIDBdLAogICAgICAgICAgWzAuMTEsIC0wLjIsIDBdLAogICAgICAgICAgWy0wLjE1LCAtMC4xNSwgMF0sCiAgICAgICAgXS5tYXAoKFt4LCB5LCB6XSwgaW5kZXgpID0+ICgKICAgICAgICAgIDxtZXNoIGtleT17aW5kZXh9IHBvc2l0aW9uPXtbeCwgeSwgel19IHNjYWxlPXtpbmRleCA9PT0gMSA/IDAuMDc1IDogMC4wNTJ9PgogICAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDEwLCA4XX0gLz4KICAgICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICAgICAgY29sb3I9IiNmZmZmZmYiCiAgICAgICAgICAgICAgZW1pc3NpdmU9e2luZGV4ICUgMiA/ICIjN2RkM2ZjIiA6ICIjYzRiNWZkIn0KICAgICAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17Mi44fQogICAgICAgICAgICAvPgogICAgICAgICAgPC9tZXNoPgogICAgICAgICkpfQogICAgICA8L2dyb3VwPgogICAgPC9TYXRlbGxpdGVTaGVsbD4KICApOwp9CgpmdW5jdGlvbiBBZXRoZXJ3eXJtU2F0ZWxsaXRlKCkgewogIGNvbnN0IHd5cm1SZWYgPSB1c2VSZWY8VEhSRUUuR3JvdXA+KG51bGwpOwogIGNvbnN0IHJpbmdSZWYgPSB1c2VSZWY8VEhSRUUuTWVzaD4obnVsbCk7CgogIGNvbnN0IHNlZ21lbnRzID0gdXNlTWVtbygKICAgICgpID0+CiAgICAgIEFycmF5LmZyb20oeyBsZW5ndGg6IDExIH0sIChfLCBpbmRleCkgPT4gewogICAgICAgIGNvbnN0IHQgPSBpbmRleCAvIDEwOwogICAgICAgIGNvbnN0IGFuZ2xlID0gdCAqIE1hdGguUEkgKiAyLjA1OwogICAgICAgIHJldHVybiB7CiAgICAgICAgICBwb3NpdGlvbjogWwogICAgICAgICAgICBNYXRoLmNvcyhhbmdsZSkgKiAoMC40MyAtIHQgKiAwLjA4KSwKICAgICAgICAgICAgdCAqIDEuMDgsCiAgICAgICAgICAgIE1hdGguc2luKGFuZ2xlKSAqICgwLjQzIC0gdCAqIDAuMDgpLAogICAgICAgICAgXSBhcyBWZWMzLAogICAgICAgICAgc2NhbGU6IDAuMTA1IC0gdCAqIDAuMDI1LAogICAgICAgIH07CiAgICAgIH0pLAogICAgW10KICApOwoKICB1c2VGcmFtZSgoeyBjbG9jayB9LCBkZWx0YSkgPT4gewogICAgaWYgKHd5cm1SZWYuY3VycmVudCkgewogICAgICB3eXJtUmVmLmN1cnJlbnQucm90YXRpb24ueSArPSBkZWx0YSAqIDAuMjY7CiAgICAgIHd5cm1SZWYuY3VycmVudC5wb3NpdGlvbi55ID0KICAgICAgICAwLjM2ICsgTWF0aC5zaW4oY2xvY2suZWxhcHNlZFRpbWUgKiAwLjkpICogMC4wODsKICAgIH0KCiAgICBpZiAocmluZ1JlZi5jdXJyZW50KSB7CiAgICAgIHJpbmdSZWYuY3VycmVudC5yb3RhdGlvbi56IC09IGRlbHRhICogMC4zMjsKICAgIH0KICB9KTsKCiAgcmV0dXJuICgKICAgIDxTYXRlbGxpdGVTaGVsbAogICAgICBwb3NpdGlvbj17TEVHRU5EQVJZX1NBVEVMTElURV9QT1NJVElPTlMuYWV0aGVyd3lybX0KICAgICAgYWNjZW50PSIjOGI1Y2Y2IgogICAgPgogICAgICA8bWVzaCBwb3NpdGlvbj17WzAsIDAuNTUsIDBdfT4KICAgICAgICA8Y29uZUdlb21ldHJ5IGFyZ3M9e1swLjQ0LCAxLjE1LCA3XX0gLz4KICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgIGNvbG9yPSIjNjI1MGE4IgogICAgICAgICAgZW1pc3NpdmU9IiM3YzNhZWQiCiAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17MC43NX0KICAgICAgICAgIG1ldGFsbmVzcz17MC4zMn0KICAgICAgICAgIHJvdWdobmVzcz17MC4yNH0KICAgICAgICAvPgogICAgICA8L21lc2g+CgogICAgICA8bWVzaCBwb3NpdGlvbj17WzAsIDEuMDUsIDBdfT4KICAgICAgICA8b2N0YWhlZHJvbkdlb21ldHJ5IGFyZ3M9e1swLjI4LCAwXX0gLz4KICAgICAgICA8bWVzaFN0YW5kYXJkTWF0ZXJpYWwKICAgICAgICAgIGNvbG9yPSIjY2ZmYWZlIgogICAgICAgICAgZW1pc3NpdmU9IiMyMmQzZWUiCiAgICAgICAgICBlbWlzc2l2ZUludGVuc2l0eT17Mi4xfQogICAgICAgIC8+CiAgICAgIDwvbWVzaD4KCiAgICAgIDxtZXNoIHJlZj17cmluZ1JlZn0gcG9zaXRpb249e1swLCAxLjAzLCAwXX0gcm90YXRpb249e1tNYXRoLlBJIC8gMiwgMCwgMF19PgogICAgICAgIDx0b3J1c0dlb21ldHJ5IGFyZ3M9e1swLjQ4LCAwLjAyNSwgOCwgMzRdfSAvPgogICAgICAgIDxtZXNoU3RhbmRhcmRNYXRlcmlhbAogICAgICAgICAgY29sb3I9IiM2N2U4ZjkiCiAgICAgICAgICBlbWlzc2l2ZT0iIzIyZDNlZSIKICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsyfQogICAgICAgIC8+CiAgICAgIDwvbWVzaD4KCiAgICAgIDxncm91cCByZWY9e3d5cm1SZWZ9IHBvc2l0aW9uPXtbMCwgMC4zNiwgMF19PgogICAgICAgIHtzZWdtZW50cy5tYXAoKHNlZ21lbnQsIGluZGV4KSA9PiAoCiAgICAgICAgICA8bWVzaCBrZXk9e2luZGV4fSBwb3NpdGlvbj17c2VnbWVudC5wb3NpdGlvbn0gc2NhbGU9e3NlZ21lbnQuc2NhbGV9PgogICAgICAgICAgICA8c3BoZXJlR2VvbWV0cnkgYXJncz17WzEsIDEyLCA5XX0gLz4KICAgICAgICAgICAgPG1lc2hTdGFuZGFyZE1hdGVyaWFsCiAgICAgICAgICAgICAgY29sb3I9e2luZGV4ICUgMiA/ICIjYTc4YmZhIiA6ICIjNjdlOGY5In0KICAgICAgICAgICAgICBlbWlzc2l2ZT17aW5kZXggJSAyID8gIiM3YzNhZWQiIDogIiMwODkxYjIifQogICAgICAgICAgICAgIGVtaXNzaXZlSW50ZW5zaXR5PXsxLjJ9CiAgICAgICAgICAgICAgbWV0YWxuZXNzPXswLjM0fQogICAgICAgICAgICAgIHJvdWdobmVzcz17MC4yNH0KICAgICAgICAgICAgLz4KICAgICAgICAgIDwvbWVzaD4KICAgICAgICApKX0KICAgICAgPC9ncm91cD4KICAgIDwvU2F0ZWxsaXRlU2hlbGw+CiAgKTsKfQoKZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTGVnZW5kYXJ5U2F0ZWxsaXRlSXNsYW5kcyh7CiAgb3duZWRDb21wYW5pb25JZHMgPSBbXSwKfTogUHJvcHMpIHsKICBjb25zdCB0b2tlbnMgPSB1c2VNZW1vKAogICAgKCkgPT4gb3duZWRDb21wYW5pb25JZHMubWFwKG5vcm1hbGl6ZVRva2VuKSwKICAgIFtvd25lZENvbXBhbmlvbklkc10KICApOwoKICBjb25zdCBoYXNNZWNoYU93bCA9IG93bnNUb2tlbih0b2tlbnMsICJtZWNoYW93bCIpOwogIGNvbnN0IGhhc0Nocm9ub0ZveCA9IG93bnNUb2tlbih0b2tlbnMsICJjaHJvbm9mb3giKTsKICBjb25zdCBoYXNBeG9sb3RsT3JhY2xlID0gb3duc1Rva2VuKHRva2VucywgImF4b2xvdGwiKTsKICBjb25zdCBoYXNBc3RyYWxOb3ZhID0gb3duc1Rva2VuKHRva2VucywgImFzdHJhbG5vdmEiKTsKICBjb25zdCBoYXNDZWxlc3RyYSA9IG93bnNUb2tlbih0b2tlbnMsICJjZWxlc3RyYSIpOwogIGNvbnN0IGhhc0FldGhlcnd5cm0gPSBvd25zVG9rZW4odG9rZW5zLCAiYWV0aGVyd3lybSIpOwoKICByZXR1cm4gKAogICAgPGdyb3VwPgogICAgICB7aGFzTWVjaGFPd2wgPyA8TWVjaGFPd2xTYXRlbGxpdGUgLz4gOiBudWxsfQogICAgICB7aGFzQ2hyb25vRm94ID8gPENocm9ub0ZveFNhdGVsbGl0ZSAvPiA6IG51bGx9CiAgICAgIHtoYXNBeG9sb3RsT3JhY2xlID8gPEF4b2xvdGxPcmFjbGVTYXRlbGxpdGUgLz4gOiBudWxsfQogICAgICB7aGFzQXN0cmFsTm92YSA/IDxBc3RyYWxOb3ZhU2F0ZWxsaXRlIC8+IDogbnVsbH0KICAgICAge2hhc0NlbGVzdHJhID8gPENlbGVzdHJhU2F0ZWxsaXRlIC8+IDogbnVsbH0KICAgICAge2hhc0FldGhlcnd5cm0gPyA8QWV0aGVyd3lybVNhdGVsbGl0ZSAvPiA6IG51bGx9CiAgICA8L2dyb3VwPgogICk7Cn0K").decode("utf-8")


class PatchError(RuntimeError):
    pass


def read_required(path: Path) -> str:
    if not path.is_file():
        raise PatchError(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise PatchError(f"Could not locate {label}.")
    return text.replace(old, new, 1)


def patch_island(text: str) -> str:
    start = text.find("type LegendaryIslandPresentation = {")
    end = text.find("function isIslandRequirementUnlocked(", start)
    if start >= 0 and end > start:
        text = text[:start] + text[end:]
    elif "LegendaryIslandResonance" in text:
        raise PatchError("Could not safely remove the old legendary resonance implementation.")

    old_hook = (
        "  const {\n"
        "    friendshipPoints,\n"
        "    activeCompanion,\n"
        "  } = useCompanion();"
    )
    new_hook = (
        "  const {\n"
        "    friendshipPoints,\n"
        "    ownedCompanions,\n"
        "  } = useCompanion();"
    )
    text = replace_once(text, old_hook, new_hook, "Island useCompanion ownership block")

    presentation_start = text.find("  const legendaryIslandPresentation =")
    presentation_end = text.find("  const friendshipSummaries =", presentation_start)
    if presentation_start >= 0 and presentation_end > presentation_start:
        text = text[:presentation_start] + text[presentation_end:]
    elif "legendaryIslandPresentation" in text:
        raise PatchError("Could not safely remove legendaryIslandPresentation.")

    text, count = re.subn(
        r"<View\s+style=\{\[\s*styles\.sceneCard,\s*legendaryIslandPresentation[\s\S]*?\]\}\s*>",
        '<View style={styles.sceneCard}>',
        text,
        count=1,
    )
    if count == 0 and "legendaryIslandPresentation" in text:
        raise PatchError("Could not simplify the Island scene card.")

    if "legendaryCompanionIds={" not in text:
        marker = (
            "            discoveries={\n"
            "              sceneDiscoveries\n"
            "            }\n"
        )
        insertion = marker + (
            "            legendaryCompanionIds={\n"
            "              ownedCompanions\n"
            "            }\n"
        )
        text = replace_once(text, marker, insertion, "NovaIsland3DScene discoveries prop")

    text, _ = re.subn(
        r"\n\s*<LegendaryIslandResonance\s+[\s\S]*?/>\n",
        "\n",
        text,
        count=1,
    )

    style_start = text.find("  legendaryIslandLayer: {")
    style_end = text.find("  cloud: {", style_start)
    if style_start >= 0 and style_end > style_start:
        text = text[:style_start] + text[style_end:]

    if "LegendaryIslandResonance" in text or "legendaryIslandPresentation" in text:
        raise PatchError("Old legendary resonance references remain in island.tsx.")

    return text


def patch_scene(text: str) -> str:
    import_line = 'import LegendarySatelliteIslands from "./LegendarySatelliteIslands";'
    if import_line not in text:
        marker = '} from "../../context/IslandContext";\n'
        text = replace_once(
            text,
            marker,
            marker + "\n" + import_line + "\n",
            "IslandContext import",
        )

    if "legendaryCompanionIds?: string[];" not in text:
        text = replace_once(
            text,
            "  discoveries: Island3DDiscovery[];\n",
            "  discoveries: Island3DDiscovery[];\n  legendaryCompanionIds?: string[];\n",
            "scene Props discoveries field",
        )

    world_start = text.find("function IslandWorld({")
    world_end = text.find("}) {", world_start)
    if world_start < 0 or world_end < 0:
        raise PatchError("Could not locate IslandWorld signature.")
    world_end += len("}) {")
    world = text[world_start:world_end]

    if "legendaryCompanionIds," not in world:
        world = replace_once(
            world,
            "  discoveries,\n  onSelectMilestone,",
            "  discoveries,\n  legendaryCompanionIds,\n  onSelectMilestone,",
            "IslandWorld ownership argument",
        )

    if "legendaryCompanionIds: string[];" not in world:
        world = replace_once(
            world,
            "  discoveries: Island3DDiscovery[];\n",
            "  discoveries: Island3DDiscovery[];\n  legendaryCompanionIds: string[];\n",
            "IslandWorld ownership type",
        )

    text = text[:world_start] + world + text[world_end:]

    if "<LegendarySatelliteIslands" not in text:
        marker = (
            "        <MagicWisps\n"
            "          level={level}\n"
            "        />\n"
        )
        insertion = marker + (
            "\n"
            "        <LegendarySatelliteIslands\n"
            "          ownedCompanionIds={\n"
            "            legendaryCompanionIds\n"
            "          }\n"
            "        />\n"
        )
        text = replace_once(text, marker, insertion, "MagicWisps render anchor")

    scene_start = text.find("export default function NovaIsland3DScene({")
    scene_end = text.find("}: Props)", scene_start)
    if scene_start < 0 or scene_end < 0:
        raise PatchError("Could not locate NovaIsland3DScene signature.")
    signature = text[scene_start:scene_end]

    if "legendaryCompanionIds = []," not in signature:
        signature = replace_once(
            signature,
            "  discoveries,\n  onSelectMilestone,",
            "  discoveries,\n  legendaryCompanionIds = [],\n  onSelectMilestone,",
            "NovaIsland3DScene ownership argument",
        )
        text = text[:scene_start] + signature + text[scene_end:]

    call_start = text.find("        <IslandWorld")
    call_end = text.find("        />", call_start)
    if call_start < 0 or call_end < 0:
        raise PatchError("Could not locate <IslandWorld /> call.")
    call = text[call_start:call_end]

    if "legendaryCompanionIds={" not in call:
        call = replace_once(
            call,
            (
                "          discoveries={\n"
                "            discoveries\n"
                "          }\n"
            ),
            (
                "          discoveries={\n"
                "            discoveries\n"
                "          }\n"
                "          legendaryCompanionIds={\n"
                "            legendaryCompanionIds\n"
                "          }\n"
            ),
            "IslandWorld discoveries prop",
        )
        text = text[:call_start] + call + text[call_end:]

    return text


def patch_layout(text: str) -> str:
    text, count = re.subn(
        r"\n// --------------------\n// DEV-ONLY imports\n// --------------------\nif \(__DEV__\) \{[\s\S]*?\n\}\n",
        "\n",
        text,
        count=1,
    )
    if count == 0 and (
        'require("../utils/dev-expose")' in text
        or 'require("../utils/achievements-smoketest")' in text
    ):
        raise PatchError("Could not safely remove the _layout dev-only test imports.")
    return text


def patch_quiz(text: str) -> str:
    text = re.sub(
        r"\n// 🔧 Dev-only UI\.[^\n]*\nconst SHOW_DEV_QUIZ_CHEAT = __DEV__;\n",
        "\n",
        text,
        count=1,
    )

    text, count = re.subn(
        r"\n  // DEV helper: force quiz to finish with target %[\s\S]*?\n  async function onPick",
        "\n  async function onPick",
        text,
        count=1,
    )
    if count == 0 and "function devForceFinish" in text:
        raise PatchError("Could not remove devForceFinish from the quiz.")

    text, count = re.subn(
        r"\n\s*\{SHOW_DEV_QUIZ_CHEAT && \([\s\S]*?\n\s*\)\}\n",
        "\n",
        text,
        count=1,
    )
    if count == 0 and "SHOW_DEV_QUIZ_CHEAT" in text:
        raise PatchError("Could not remove the quiz cheat UI.")

    style_start = text.find("  devRow: {")
    style_end = text.find("\n});", style_start)
    if style_start >= 0 and style_end > style_start:
        text = text[:style_start] + text[style_end:]

    if "SHOW_DEV_QUIZ_CHEAT" in text or "devForceFinish" in text:
        raise PatchError("Quiz dev-test references remain.")

    return text


def syntax_check(files: dict[Path, str]) -> None:
    node_script = r'''
const fs = require("fs");
const ts = require("typescript");
let failed = false;
for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  });
  const errors = (result.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  if (errors.length) {
    failed = true;
    console.error(`Syntax errors in ${file}:`);
    for (const error of errors) {
      console.error(ts.flattenDiagnosticMessageText(error.messageText, "\\n"));
    }
  }
}
process.exit(failed ? 1 : 0);
'''

    with tempfile.TemporaryDirectory(prefix="nova-legendary-islands-") as temp:
        temp_root = Path(temp)
        temp_files: list[str] = []
        for index, (path, content) in enumerate(files.items()):
            target = temp_root / f"{index}-{path.name}"
            target.write_text(content, encoding="utf-8")
            temp_files.append(str(target))

        result = subprocess.run(
            ["node", "-e", node_script, *temp_files],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        if result.returncode != 0:
            raise PatchError(result.stderr.strip() or result.stdout.strip())


def make_backup(paths: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = ROOT / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / f"before_legendary_satellite_islands_{stamp}.zip"

    with zipfile.ZipFile(backup, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            if path.is_file():
                archive.write(path, path.relative_to(ROOT))

    return backup


def main() -> int:
    try:
        island = patch_island(read_required(ISLAND))
        scene = patch_scene(read_required(SCENE))
        layout = patch_layout(read_required(LAYOUT))
        quiz = patch_quiz(read_required(QUIZ))

        updated = {
            ISLAND: island,
            SCENE: scene,
            COMPONENT: COMPONENT_SOURCE,
            LAYOUT: layout,
            QUIZ: quiz,
        }

        syntax_check(updated)
        backup = make_backup([ISLAND, SCENE, COMPONENT, LAYOUT, QUIZ, *DEV_ROUTES])

        COMPONENT.parent.mkdir(parents=True, exist_ok=True)
        for path, content in updated.items():
            path.write_text(content, encoding="utf-8")

        removed: list[str] = []
        for route in DEV_ROUTES:
            if route.is_file():
                route.unlink()
                removed.append(str(route.relative_to(ROOT)))

        print("✅ Created app/components/island3d/LegendarySatelliteIslands.tsx")
        print("✅ Connected every owned legendary to the 3D Island scene")
        print("✅ Removed the old equipped-only center resonance circle/banner")
        print("✅ Removed the dev-test route files")
        print("✅ Removed _layout dev-test imports")
        print("✅ Removed the quiz cheat UI and helper")
        print("✅ Syntax check passed for every changed TS/TSX file")
        print(f"✅ Backup: {backup.relative_to(ROOT)}")
        if removed:
            print("Removed routes:")
            for item in removed:
                print(f"  - {item}")
        print("\nNext command: npx expo start -c")
        return 0

    except PatchError as error:
        print("❌ Nothing was written.")
        print(f"Reason: {error}")
        return 1
    except Exception as error:
        print("❌ Nothing was written.")
        print(f"Unexpected error: {type(error).__name__}: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

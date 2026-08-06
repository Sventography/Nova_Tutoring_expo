#!/usr/bin/env python3
"""
Nova Tutoring — Ask daily-counter isolation

Fixes the device-wide `@ask/count/YYYY-MM-DD` counter so that:
- guest mode has its own daily counter;
- every signed-in account has its own daily counter;
- old unscoped counters are removed;
- a count loaded for a previous identity cannot flash after an account switch;
- no header layout or other Ask UI is changed.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path.cwd()
ASK = ROOT / "app/(tabs)/ask.tsx"


class PatchError(RuntimeError):
    pass


def read_required(path: Path) -> str:
    if not path.is_file():
        raise PatchError(f"Missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def replace_counter_helpers(text: str) -> str:
    start = text.find("const todayKey =")
    end = text.find("function buildHistoryFromMessages", start)

    if start < 0 or end < 0:
        if "const askCountOwnerKey" in text and "guest:v2" in text:
            return text
        raise PatchError(
            "Could not locate the Ask daily-counter helper block."
        )

    replacement = '''const askCountOwnerKey = (
  userId: string | null | undefined
): string => {
  if (!userId) return "guest:v2";
  return `user:${encodeURIComponent(userId)}`;
};

const todayKey = (
  userId: string | null | undefined
): string => {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

  return `@ask/count:v2/${askCountOwnerKey(
    userId
  )}/${date}`;
};

async function removeLegacyUnscopedAskCounts() {
  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = keys.filter((key) =>
    /^@ask\\/count\\/\\d{4}-\\d{2}-\\d{2}$/.test(
      key
    )
  );

  if (legacyKeys.length > 0) {
    await AsyncStorage.multiRemove(legacyKeys);
  }
}

async function loadCount(
  userId: string | null | undefined
): Promise<number> {
  const value = await AsyncStorage.getItem(
    todayKey(userId)
  );
  const parsed = Number.parseInt(
    value ?? "0",
    10
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 0;
}

async function bumpCount(
  userId: string | null | undefined
): Promise<number> {
  const key = todayKey(userId);
  const current = await loadCount(userId);
  const next = current + 1;

  await AsyncStorage.setItem(
    key,
    String(next)
  );

  return next;
}

'''

    return text[:start] + replacement + text[end:]


def replace_counter_effect(text: str) -> str:
    old_variants = [
        '''  useEffect(() => {
    loadCount().then(setCount).catch(() => {});
  }, []);''',
        '''  useEffect(() => {
    loadCount()
      .then(setCount)
      .catch(() => {});
  }, []);''',
    ]

    replacement = '''  useEffect(() => {
    let cancelled = false;

    setCount(0);

    void (async () => {
      try {
        await removeLegacyUnscopedAskCounts();
        const nextCount = await loadCount(
          supabaseUserId
        );

        if (!cancelled) {
          setCount(nextCount);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseUserId]);'''

    for old in old_variants:
        if old in text:
            return text.replace(old, replacement, 1)

    if (
        "removeLegacyUnscopedAskCounts" in text
        and "}, [supabaseUserId]);" in text
    ):
        return text

    raise PatchError(
        "Could not locate the Ask daily-count loading effect."
    )


def replace_bump_call(text: str) -> str:
    if "await bumpCount(supabaseUserId)" in text:
        return text

    old = "await bumpCount()"
    if old not in text:
        raise PatchError(
            "Could not locate the Ask counter increment call."
        )

    return text.replace(
        old,
        "await bumpCount(supabaseUserId)",
        1,
    )


def patch_ask(text: str) -> str:
    text = replace_counter_helpers(text)
    text = replace_counter_effect(text)
    text = replace_bump_call(text)
    return text


def syntax_check(content: str) -> None:
    node_script = r'''
const fs = require("fs");
const ts = require("typescript");

const file = process.argv[1];
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
  (diagnostic) =>
    diagnostic.category ===
    ts.DiagnosticCategory.Error
);

if (errors.length) {
  for (const error of errors) {
    console.error(
      ts.flattenDiagnosticMessageText(
        error.messageText,
        "\\n"
      )
    );
  }
  process.exit(1);
}
'''

    with tempfile.TemporaryDirectory(
        prefix="nova-ask-counter-isolation-"
    ) as temp:
        target = Path(temp) / "ask.tsx"
        target.write_text(content, encoding="utf-8")

        result = subprocess.run(
            ["node", "-e", node_script, str(target)],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )

        if result.returncode != 0:
            raise PatchError(
                result.stderr.strip()
                or result.stdout.strip()
                or "Unknown TypeScript syntax error."
            )


def create_backup() -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    directory = ROOT / "backups"
    directory.mkdir(parents=True, exist_ok=True)

    output = (
        directory
        / f"before_ask_counter_isolation_{stamp}.zip"
    )

    with zipfile.ZipFile(
        output,
        "w",
        compression=zipfile.ZIP_DEFLATED,
    ) as archive:
        archive.write(ASK, ASK.relative_to(ROOT))

    return output


def main() -> int:
    try:
        original = read_required(ASK)
        updated = patch_ask(original)

        syntax_check(updated)
        backup = create_backup()
        ASK.write_text(updated, encoding="utf-8")

        print("✅ Ask daily-counter isolation installed.")
        print("✅ Guest and signed-in counters now use separate keys.")
        print("✅ Every signed-in account gets its own daily counter.")
        print("✅ Old shared @ask/count/YYYY-MM-DD keys are removed.")
        print("✅ Counter resets immediately while an identity changes.")
        print("✅ No header or Ask layout changes were made.")
        print("✅ TypeScript syntax check passed.")
        print(f"✅ Backup: {backup.relative_to(ROOT)}")
        print()
        print("Next: restart Metro and reopen Nova on the iPhone.")
        return 0

    except PatchError as error:
        print("❌ Nothing was written.")
        print(f"Reason: {error}")
        return 1
    except Exception as error:
        print("❌ Nothing was written.")
        print(
            "Unexpected error: "
            f"{type(error).__name__}: {error}"
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

ROOT = Path.cwd()
COINS = ROOT / "app/context/CoinsContext.tsx"

NEW_GUEST_KEY = "@nova/coins:guest:v4"


class PatchError(RuntimeError):
    pass


def read_required(path: Path) -> str:
    if not path.is_file():
        raise PatchError(
            f"Missing required file: {path.relative_to(ROOT)}"
        )

    return path.read_text(encoding="utf-8")


def patch_guest_key(text: str) -> str:
    pattern = re.compile(
        r'const\s+GUEST_COINS_KEY\s*=\s*'
        r'(?:\n\s*)?'
        r'["\']@nova/coins:guest(?::v\d+)?["\'];'
    )

    replacement = (
        'const GUEST_COINS_KEY =\n'
        f'  "{NEW_GUEST_KEY}";'
    )

    updated, count = pattern.subn(
        replacement,
        text,
        count=1,
    )

    if count == 1:
        return updated

    if f'"{NEW_GUEST_KEY}"' in text:
        return text

    raise PatchError(
        "Could not locate GUEST_COINS_KEY in CoinsContext."
    )


def add_legacy_key_list(text: str) -> str:
    marker = (
        'const USER_COINS_PREFIX =\n'
        '  "@nova/coins:user:";'
    )

    block = """

const LEGACY_GUEST_COIN_KEYS = [
  "@nova/coins:guest",
  "@nova/coins:guest:meta:v2",
  "@nova/coins:guest:v2",
  "@nova/coins:guest:v2:meta:v2",
  "@nova/coins:guest:v3",
  "@nova/coins:guest:v3:meta:v2",
] as const;
"""

    if "const LEGACY_GUEST_COIN_KEYS" in text:
        return text

    if marker not in text:
        raise PatchError(
            "Could not locate USER_COINS_PREFIX in CoinsContext."
        )

    return text.replace(
        marker,
        marker + block,
        1,
    )


def add_guest_cleanup(text: str) -> str:
    owner_start = text.find(
        "const loadCoinsForOwner"
    )
    owner_end = text.find(
        "const refreshCoins",
        owner_start,
    )

    if owner_start < 0 or owner_end < 0:
        raise PatchError(
            "Could not isolate loadCoinsForOwner()."
        )

    owner_block = text[
        owner_start:owner_end
    ]

    if (
        "AsyncStorage.multiRemove"
        in owner_block
        and "LEGACY_GUEST_COIN_KEYS"
        in owner_block
    ):
        return text

    pattern = re.compile(
        r'(const\s+loadCoinsForOwner\s*=\s*\n'
        r'\s*async\s*\(\s*\n'
        r'\s*ownerId:\s*string\s*\|\s*null\s*\n'
        r'\s*\):\s*Promise<number>\s*=>\s*\{\s*\n)'
    )

    match = pattern.search(text)

    if not match:
        raise PatchError(
            "Could not locate loadCoinsForOwner() signature."
        )

    insertion = """      if (!ownerId) {
        /*
         * Guest wallet v4 intentionally starts clean.
         * Remove only historical guest keys that may contain data leaked
         * from older builds. Signed-in user keys are never touched.
         */
        await AsyncStorage.multiRemove([
          ...LEGACY_GUEST_COIN_KEYS,
        ]);
      }

"""

    return (
        text[:match.end()]
        + insertion
        + text[match.end():]
    )


def patch_coins(text: str) -> str:
    text = patch_guest_key(text)
    text = add_legacy_key_list(text)
    text = add_guest_cleanup(text)
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
        prefix="nova-guest-wallet-v4-"
    ) as temp:
        target = Path(temp) / "CoinsContext.tsx"
        target.write_text(
            content,
            encoding="utf-8",
        )

        result = subprocess.run(
            [
                "node",
                "-e",
                node_script,
                str(target),
            ],
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
    stamp = datetime.now().strftime(
        "%Y%m%d-%H%M%S"
    )

    backup_dir = ROOT / "backups"
    backup_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output = (
        backup_dir
        / f"before_fresh_guest_wallet_{stamp}.zip"
    )

    with zipfile.ZipFile(
        output,
        "w",
        compression=zipfile.ZIP_DEFLATED,
    ) as archive:
        archive.write(
            COINS,
            COINS.relative_to(ROOT),
        )

    return output


def main() -> int:
    try:
        original = read_required(COINS)
        updated = patch_coins(original)

        syntax_check(updated)
        backup = create_backup()

        COINS.write_text(
            updated,
            encoding="utf-8",
        )

        print("✅ Fresh guest wallet installed.")
        print(
            f"✅ Guest coins now use: {NEW_GUEST_KEY}"
        )
        print(
            "✅ Removed all older contaminated guest coin keys on guest load."
        )
        print(
            "✅ Signed-in local and Supabase balances are untouched."
        )
        print(
            "✅ TypeScript syntax check passed."
        )
        print(
            f"✅ Backup: {backup.relative_to(ROOT)}"
        )
        print()
        print(
            "Next: restart Metro, fully close Nova on the iPhone, "
            "then reopen it and enter guest mode."
        )

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

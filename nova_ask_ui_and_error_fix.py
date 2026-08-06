#!/usr/bin/env python3
"""
Nova Tutoring — Ask Nova UI + safe error handling

Changes only:
- app/(tabs)/ask.tsx
- the live Flask file containing def _ask_logic() (when found)

Does NOT change the app header, username, or coin pill.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
import subprocess
import sys
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


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise PatchError(f"Could not locate {label}.")
    return text.replace(old, new, 1)


def insert_after_backend_base(text: str) -> str:
    if "ASK_EXPERIENCE_DETAILS_KEY" in text:
        return text

    match = re.search(
        r'(const BACKEND_BASE\s*=\s*[\s\S]*?;\n)',
        text,
        flags=re.MULTILINE,
    )
    if not match:
        raise PatchError("Could not locate BACKEND_BASE in Ask screen.")

    helper = r'''

const ASK_EXPERIENCE_DETAILS_KEY =
  "@nova/ask/experience-details-expanded.v1";

function askErrorText(
  value: unknown,
  status?: number
): string {
  let raw = "";

  if (typeof value === "string") {
    raw = value;
  } else if (
    value &&
    typeof value === "object"
  ) {
    const record = value as Record<
      string,
      unknown
    >;

    if (
      typeof record.message === "string"
    ) {
      raw = record.message;
    } else {
      try {
        raw = JSON.stringify(value);
      } catch {
        raw = "";
      }
    }
  }

  const lowered = raw.toLowerCase();

  if (
    status === 429 ||
    lowered.includes(
      "credit_balance_exhausted"
    ) ||
    lowered.includes(
      "insufficient_quota"
    ) ||
    lowered.includes("quota")
  ) {
    return (
      "Nova is taking a quick break " +
      "right now. Please try again later."
    );
  }

  if (
    lowered.includes("network") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("timed out") ||
    lowered.includes("timeout")
  ) {
    return (
      "Nova could not connect right now. " +
      "Check your connection and try again."
    );
  }

  return (
    "Nova is temporarily unavailable. " +
    "Please try again in a few moments."
  );
}
'''

    return text[: match.end()] + helper + text[match.end() :]


def patch_api_response(text: str) -> str:
    old = '''    const json = (await res.json()) as any;

    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error || `Request failed (status ${res.status})`,
      };
    }
'''

    new = '''    const responseText = await res.text();
    let json: any = {};

    try {
      json = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      json = {};
    }

    if (!res.ok || json.error) {
      const rawError =
        json?.error?.message ??
        json?.error ??
        json?.message ??
        responseText;

      console.warn(
        "[Ask] request failed",
        {
          status: res.status,
          rawError,
        }
      );

      return {
        ok: false,
        error: askErrorText(
          rawError,
          res.status
        ),
      };
    }
'''

    text = replace_once(
        text,
        old,
        new,
        "Ask API response handling",
    )

    old_catch = '''  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error while calling /api/ask" };
  }
'''

    new_catch = '''  } catch (e: any) {
    console.warn(
      "[Ask] request exception",
      e
    );

    return {
      ok: false,
      error: askErrorText(
        e?.message || e
      ),
    };
  }
'''

    return replace_once(
        text,
        old_catch,
        new_catch,
        "Ask API catch block",
    )


def add_collapsed_state(text: str) -> str:
    old = '''  const [open, setOpen] = useState(false);
'''

    new = '''  const [open, setOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(
      ASK_EXPERIENCE_DETAILS_KEY
    )
      .then((stored) => {
        if (mounted) {
          setDetailsExpanded(
            stored === "1"
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);
'''

    return replace_once(
        text,
        old,
        new,
        "Nova Experience expanded state",
    )


def add_toggle_function(text: str) -> str:
    if "toggleExperienceDetails" in text:
        return text

    old = '''  const choose = async (key: PersonalityKey) => {
    setOpen(false);
    if (key === value || disabled) return;
    await onChange(key);
  };
'''

    new = '''  const choose = async (key: PersonalityKey) => {
    setOpen(false);
    if (key === value || disabled) return;
    await onChange(key);
  };

  const toggleExperienceDetails = () => {
    setDetailsExpanded((current) => {
      const next = !current;

      void AsyncStorage.setItem(
        ASK_EXPERIENCE_DETAILS_KEY,
        next ? "1" : "0"
      ).catch(() => {});

      return next;
    });
  };
'''

    return replace_once(
        text,
        old,
        new,
        "Nova Experience toggle function",
    )


def wrap_experience_details(text: str) -> str:
    if "ABOUT THIS EXPERIENCE" in text:
        return text

    start_marker = '''      <View
        style={[
          S.experienceCard,'''
    start = text.find(start_marker)
    if start < 0:
        raise PatchError("Could not locate Nova Experience details card.")

    end_marker = '''

      <Modal
        visible={open}'''
    end = text.find(end_marker, start)
    if end < 0:
        raise PatchError("Could not locate Nova Experience modal after details card.")

    details = text[start:end]

    toggle = '''      <Pressable
        onPress={toggleExperienceDetails}
        accessibilityRole="button"
        accessibilityLabel={
          detailsExpanded
            ? "Hide Nova experience details"
            : "Show Nova experience details"
        }
        style={({ pressed }) => ({
          marginTop: 8,
          minHeight: 38,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: `${selected.accent}66`,
          backgroundColor: tokens?.isDark
            ? "rgba(2,6,23,0.34)"
            : "rgba(255,255,255,0.44)",
          paddingHorizontal: 11,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.76 : 1,
        })}
      >
        <Text
          style={{
            color: selected.accent,
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 0.45,
          }}
        >
          ABOUT THIS EXPERIENCE
        </Text>

        <Ionicons
          name={
            detailsExpanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={18}
          color={selected.accent}
        />
      </Pressable>

      {detailsExpanded ? (
        <>
'''

    closing = '''
        </>
      ) : null}'''

    return text[:start] + toggle + details + closing + text[end:]


def patch_error_ui(text: str) -> str:
    if "Nova could not answer that just now." in text:
        return text

    pattern = re.compile(
        r'\{error\s*\?\s*<Text\s+style=\{\{\s*color:\s*"#ffa7a7",\s*marginTop:\s*6\s*\}\}>\{error\}</Text>\s*:\s*null\}',
        flags=re.MULTILINE,
    )

    replacement = '''{error ? (
                <View
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      "rgba(248,113,113,0.58)",
                    backgroundColor:
                      "rgba(127,29,29,0.18)",
                    paddingHorizontal: 11,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 9,
                  }}
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={20}
                    color="#FCA5A5"
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#FECACA",
                        fontSize: 12,
                        fontWeight: "900",
                        marginBottom: 3,
                      }}
                    >
                      Nova could not answer that just now.
                    </Text>

                    <Text
                      style={{
                        color: "#FCA5A5",
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {error}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setError(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss error"
                    hitSlop={10}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#FCA5A5"
                    />
                  </Pressable>
                </View>
              ) : null}'''

    updated, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise PatchError("Could not locate the inline Ask error text.")
    return updated


def patch_ask(text: str) -> str:
    text = insert_after_backend_base(text)
    text = patch_api_response(text)
    text = add_collapsed_state(text)
    text = add_toggle_function(text)
    text = wrap_experience_details(text)
    text = patch_error_ui(text)
    return text


def candidate_backend_files() -> list[Path]:
    preferred = [
        ROOT / "server/server.py",
        ROOT / "server/app.py",
        ROOT / "backend/app.py",
        ROOT / "backend/server.py",
        ROOT / "app.py",
        ROOT / "server.py",
    ]

    found: list[Path] = []
    for path in preferred:
        if path.is_file():
            found.append(path)

    ignored_tokens = (
        "backup",
        "archive",
        "quarantine",
        "old",
        "deprecated",
        "node_modules",
        ".venv",
        "venv",
        "before_",
    )

    for path in ROOT.rglob("*.py"):
        lower = str(path.relative_to(ROOT)).lower()
        if any(token in lower for token in ignored_tokens):
            continue
        if path in found:
            continue
        try:
            sample = path.read_text(encoding="utf-8")
        except Exception:
            continue
        if (
            "def _ask_logic" in sample
            and "openai_client" in sample
            and "chat.completions.create" in sample
        ):
            found.append(path)

    return found


def choose_backend() -> Path | None:
    candidates = candidate_backend_files()
    for path in candidates:
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        if (
            "def _ask_logic" in text
            and "chat.completions.create" in text
        ):
            return path
    return None


def patch_backend(text: str) -> str:
    if "AI_SERVICE_UNAVAILABLE" in text:
        return text

    pattern = re.compile(
        r'''  except Exception as (?P<name>error|e):\n'''
        r'''    print\("\[server\] OpenAI error:", (?P=name)\)\n'''
        r'''    return jsonify\(\n'''
        r'''      ok=False,\n'''
        r'''      error=str\((?P=name)\),\n'''
        r'''    \), 500''',
        flags=re.MULTILINE,
    )

    replacement = '''  except Exception as error:
    error_type = type(error).__name__
    status_code = getattr(
      error,
      "status_code",
      None,
    )
    error_code = getattr(
      error,
      "code",
      None,
    )

    print(
      "[server] OpenAI error:",
      {
        "type": error_type,
        "status": status_code,
        "code": error_code,
        "detail": repr(error),
      },
    )

    # Never expose provider messages, API links,
    # keys, quota details, or raw JSON to users.
    return jsonify(
      ok=False,
      code="AI_SERVICE_UNAVAILABLE",
      error=(
        "Nova is temporarily unavailable. "
        "Please try again in a few moments."
      ),
    ), 503'''

    updated, count = pattern.subn(
        replacement,
        text,
        count=1,
    )

    if count != 1:
        raise PatchError(
            "Could not safely locate the live Flask OpenAI exception block."
        )

    return updated


def syntax_check_ts(path: Path, content: str) -> None:
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
  (item) => item.category === ts.DiagnosticCategory.Error
);
if (errors.length) {
  for (const error of errors) {
    console.error(
      ts.flattenDiagnosticMessageText(error.messageText, "\\n")
    );
  }
  process.exit(1);
}
'''

    with tempfile.TemporaryDirectory(prefix="nova-ask-check-") as temp:
        target = Path(temp) / path.name
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
                or "Ask TypeScript syntax check failed."
            )


def syntax_check_python(content: str) -> None:
    compile(content, "server.py", "exec")


def make_backup(paths: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = ROOT / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    output = backup_dir / f"before_ask_ui_error_fix_{stamp}.zip"

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            if path.is_file():
                archive.write(path, path.relative_to(ROOT))

    return output


def main() -> int:
    try:
        ask_original = read_required(ASK)
        ask_updated = patch_ask(ask_original)
        syntax_check_ts(ASK, ask_updated)

        backend_path = choose_backend()
        backend_updated: str | None = None

        if backend_path is not None:
            backend_original = backend_path.read_text(encoding="utf-8")
            backend_updated = patch_backend(backend_original)
            syntax_check_python(backend_updated)

        backup_paths = [ASK]
        if backend_path is not None:
            backup_paths.append(backend_path)
        backup_path = make_backup(backup_paths)

        ASK.write_text(ask_updated, encoding="utf-8")
        if backend_path is not None and backend_updated is not None:
            backend_path.write_text(backend_updated, encoding="utf-8")

        print("✅ Ask Nova UI and error handling installed.")
        print("✅ Nova Experience details are collapsed by default.")
        print("✅ The expanded/collapsed choice is remembered on the device.")
        print("✅ Raw API JSON and billing links are hidden from users.")
        print("✅ Friendly quota, network, and service messages are shown.")
        print("✅ The header, username, and coin pill were not changed.")
        print("✅ Ask TypeScript syntax check passed.")

        if backend_path is not None:
            print(
                "✅ Flask backend patched:",
                backend_path.relative_to(ROOT),
            )
            print("✅ Flask Python syntax check passed.")
        else:
            print(
                "⚠️ No live Flask _ask_logic() file was found in this project."
            )
            print(
                "   The app-side protection is installed, but patch the backend"
            )
            print(
                "   in its repository before the App Store build."
            )

        print("✅ Backup:", backup_path.relative_to(ROOT))
        print()
        print("Next: npx expo start --dev-client --clear")
        if backend_path is not None:
            print(
                "Then commit and push the backend change so Render redeploys it."
            )

        return 0

    except PatchError as error:
        print("❌ Nothing was written.")
        print("Reason:", error)
        return 1
    except SyntaxError as error:
        print("❌ Nothing was written.")
        print("Python syntax check failed:", error)
        return 1
    except Exception as error:
        print("❌ Nothing was written.")
        print(
            "Unexpected error:",
            f"{type(error).__name__}: {error}",
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

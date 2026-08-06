#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path.cwd()
SHOP = ROOT / "app/(tabs)/shop.tsx"
PURCHASES = ROOT / "app/(tabs)/purchases.tsx"


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


def patch_shop(text: str) -> str:
    text = replace_once(
        text,
        'import { notifyCoinOrder } from "../utils/coin-order";',
        'import { notifyCoinOrder } from "../utils/coin-order";\n'
        'import { showToast } from "../utils/toast";',
        "Shop toast import",
    )

    text = replace_once(
        text,
        '''  const {
    activeCompanionId: equippedCompanionId,
    ownedCompanions: ownedCompanionIds,
    equipCompanion,
  } = useCompanion();''',
        '''  const {
    activeCompanionId: equippedCompanionId,
    ownedCompanions: ownedCompanionIds,
    equipCompanion,
    clearCompanion,
  } = useCompanion();''',
        "Shop companion context destructuring",
    )

    text = replace_once(
        text,
        '''  function triggerCompanion(id: string) {''',
        '''  async function unequipCompanionNow(
    source:
      | "shop_header"
      | "quick_row"
      | "legendary_quick_row"
      | "detail_modal" = "shop_header"
  ) {
    const previousId = equippedCompanionId
      ? canonId(equippedCompanionId)
      : null;

    setFloatingCompanion(null);
    setActiveEffect(null);
    setStripActiveId(null);
    companionAnim.stopAnimation();
    companionAnim.setValue(0);

    await clearCompanion();

    track("companion_unequipped", {
      id: previousId,
      source,
    });

    showToast("Companion unequipped");
  }

  function triggerCompanion(id: string) {''',
        "Shop companion unequip helper",
    )

    text = replace_once(
        text,
        '''            <Text
              style={{
                color: tokens.titleText as any,
                fontSize: 14,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              My Companions
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>''',
        '''            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: tokens.titleText as any,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                My Companions
              </Text>

              {equippedCompanionId ? (
                <Pressable
                  onPress={() =>
                    void unequipCompanionNow(
                      "shop_header"
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Show no companion"
                  style={({ pressed }) => ({
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#FCA5A5",
                    backgroundColor: pressed
                      ? "rgba(239,68,68,0.22)"
                      : "rgba(239,68,68,0.10)",
                  })}
                >
                  <Text
                    style={{
                      color: "#FCA5A5",
                      fontSize: 10,
                      fontWeight: "900",
                    }}
                  >
                    NO COMPANION
                  </Text>
                </Pressable>
              ) : (
                <Text
                  style={{
                    color: tokens.cardText as any,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  NONE EQUIPPED
                </Text>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>''',
        "Shop My Companions header",
    )

    text = replace_once(
        text,
        '''                      onPress={() => triggerCompanion(it.id)}
                      onLongPress={() => setDetailItem(it)}
                      delayLongPress={350}
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        isActive ? "Equipped" : "Equip"
                      } ${it.shortLabel || it.title}`}
                      accessibilityHint="Tap to equip. Press and hold for details."''',
        '''                      onPress={() =>
                        isActive
                          ? void unequipCompanionNow(
                              "quick_row"
                            )
                          : triggerCompanion(it.id)
                      }
                      onLongPress={() => setDetailItem(it)}
                      delayLongPress={350}
                      accessibilityRole="button"
                      accessibilityLabel={`${
                        isActive ? "Unequip" : "Equip"
                      } ${it.shortLabel || it.title}`}
                      accessibilityHint={
                        isActive
                          ? "Tap to show no companion. Press and hold for details."
                          : "Tap to equip. Press and hold for details."
                      }''',
        "common companion quick-row button",
    )

    text = replace_once(
        text,
        '''                      {isActive ? "Equipped" : "Tap to equip"}''',
        '''                      {isActive
                        ? "Tap to unequip"
                        : "Tap to equip"}''',
        "common companion quick-row status",
    )

    text = replace_once(
        text,
        '''                        onPress={() =>
                          triggerCompanion(
                            it.id
                          )
                        }
                        onLongPress={() =>
                          setDetailItem(it)
                        }
                        delayLongPress={350}
                        accessibilityRole="button"
                        accessibilityLabel={`${
                          isActive
                            ? "Equipped"
                            : "Equip"
                        } ${
                          it.shortLabel ||
                          it.title
                        }`}
                        accessibilityHint="Tap to equip. Press and hold for details."''',
        '''                        onPress={() =>
                          isActive
                            ? void unequipCompanionNow(
                                "legendary_quick_row"
                              )
                            : triggerCompanion(
                                it.id
                              )
                        }
                        onLongPress={() =>
                          setDetailItem(it)
                        }
                        delayLongPress={350}
                        accessibilityRole="button"
                        accessibilityLabel={`${
                          isActive
                            ? "Unequip"
                            : "Equip"
                        } ${
                          it.shortLabel ||
                          it.title
                        }`}
                        accessibilityHint={
                          isActive
                            ? "Tap to show no companion. Press and hold for details."
                            : "Tap to equip. Press and hold for details."
                        }''',
        "legendary companion quick-row button",
    )

    text = replace_once(
        text,
        '''                        {isActive
                          ? "EQUIPPED"
                          : "TAP TO EQUIP"}''',
        '''                        {isActive
                          ? "TAP TO UNEQUIP"
                          : "TAP TO EQUIP"}''',
        "legendary companion quick-row status",
    )

    text = replace_once(
        text,
        '''        primaryLabel={
          detailItem?.category === "companions" &&
          isCompanionOwned(detailItem?.id) &&
          !isCompanionEquipped(detailItem?.id)
            ? "Equip Companion"
            : detailItem?.category === "companions" &&
              !isCompanionOwned(detailItem?.id)''',
        '''        primaryLabel={
          detailItem?.category === "companions" &&
          isCompanionOwned(detailItem?.id) &&
          isCompanionEquipped(detailItem?.id)
            ? "Unequip Companion"
            : detailItem?.category === "companions" &&
              isCompanionOwned(detailItem?.id) &&
              !isCompanionEquipped(detailItem?.id)
            ? "Equip Companion"
            : detailItem?.category === "companions" &&
              !isCompanionOwned(detailItem?.id)''',
        "companion detail modal primary label",
    )

    text = replace_once(
        text,
        '''        onPrimaryAction={
          detailItem?.category === "companions" &&
          isCompanionOwned(detailItem?.id) &&
          !isCompanionEquipped(detailItem?.id)
            ? () => {
                triggerCompanion(detailItem.id);
                setDetailItem(null);
              }
            : detailItem?.category === "companions" &&
              !isCompanionOwned(detailItem?.id)''',
        '''        onPrimaryAction={
          detailItem?.category === "companions" &&
          isCompanionOwned(detailItem?.id) &&
          isCompanionEquipped(detailItem?.id)
            ? () => {
                setDetailItem(null);
                void unequipCompanionNow(
                  "detail_modal"
                );
              }
            : detailItem?.category === "companions" &&
              isCompanionOwned(detailItem?.id) &&
              !isCompanionEquipped(detailItem?.id)
            ? () => {
                triggerCompanion(detailItem.id);
                setDetailItem(null);
              }
            : detailItem?.category === "companions" &&
              !isCompanionOwned(detailItem?.id)''',
        "companion detail modal action",
    )

    return text


def patch_purchases(text: str) -> str:
    text = replace_once(
        text,
        'import { usePurchases } from "../context/PurchasesContext";',
        'import { usePurchases } from "../context/PurchasesContext";\n'
        'import { useCompanion } from "../context/CompanionContext";',
        "Purchases companion import",
    )

    text = replace_once(
        text,
        '''  const { tokens, themeId, setThemeById } = useTheme();
  const { isOwned } = usePurchases();''',
        '''  const { tokens, themeId, setThemeById } = useTheme();
  const { isOwned } = usePurchases();
  const {
    activeCompanionId,
    equipCompanion,
    clearCompanion,
  } = useCompanion();''',
        "Purchases companion context",
    )

    text = replace_once(
        text,
        '''  const equippedTheme = canonId(themeId as any);
  const equippedCursor = canonId(cursorId as any);''',
        '''  const equippedTheme = canonId(themeId as any);
  const equippedCursor = canonId(cursorId as any);
  const equippedCompanion = canonId(
    activeCompanionId as any
  );''',
        "Purchases equipped companion ID",
    )

    text = replace_once(
        text,
        '''  async function unequipCursor() {
    if (!setCursorById) return;
    setCursorById(null);
    showToast("Cursor unequipped");
  }

  return (''',
        '''  async function unequipCursor() {
    if (!setCursorById) return;
    setCursorById(null);
    showToast("Cursor unequipped");
  }

  async function equipOwnedCompanion(
    id: string
  ) {
    const cid = canonId(id);
    if (!cid) return;

    await equipCompanion(cid);
    showToast("Companion equipped");
  }

  async function unequipOwnedCompanion() {
    await clearCompanion();
    showToast("Companion unequipped");
  }

  return (''',
        "Purchases companion actions",
    )

    text = replace_once(
        text,
        '''          Everything you’ve unlocked in the shop lives here. Equip themes
          and cursors, or just admire your collection.''',
        '''          Everything you’ve unlocked in the shop lives here. Equip or
          unequip themes, cursors, and companions whenever you like.''',
        "Purchases introductory copy",
    )

    old_block = '''        {ownedCompanions.length > 0 && (
          <Section title="Companions">
            {ownedCompanions.map((it: any) => (
              <Card key={it.id} color={CATEGORY_BORDER.tangibles}>
                {it.image ? (
                  <Image
                    source={it.image}
                    style={{
                      width: "100%",
                      height: 90,
                      borderRadius: 10,
                      marginBottom: 8,
                    }}
                    resizeMode="contain"
                  />
                ) : null}

                <Text
                  style={{
                    color: tokens.text as any,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {it.title}
                </Text>

                {it.desc ? (
                  <Text
                    style={{
                      color: tokens.cardText as any,
                      fontSize: 12,
                      lineHeight: 16,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                    numberOfLines={3}
                  >
                    {it.desc}
                  </Text>
                ) : null}

                <View style={{ height: 10 }} />

                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: CATEGORY_BORDER.tangibles,
                  }}
                >
                  <Text
                    style={{
                      color: CATEGORY_BORDER.tangibles,
                      fontWeight: "800",
                    }}
                  >
                    Owned ✓
                  </Text>
                </View>
              </Card>
            ))}
          </Section>
        )}'''

    new_block = '''        {ownedCompanions.length > 0 && (
          <Section title="Companions">
            {ownedCompanions.map((it: any) => {
              const cid = canonId(it.id);
              const isEquipped =
                !!cid &&
                !!equippedCompanion &&
                cid === equippedCompanion;

              return (
                <Card
                  key={it.id}
                  color={
                    isEquipped
                      ? "#FACC15"
                      : CATEGORY_BORDER.tangibles
                  }
                >
                  {it.image ? (
                    <Image
                      source={it.image}
                      style={{
                        width: "100%",
                        height: 90,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                      resizeMode="contain"
                    />
                  ) : null}

                  <Text
                    style={{
                      color: tokens.text as any,
                      fontSize: 14,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {it.title}
                  </Text>

                  {it.desc ? (
                    <Text
                      style={{
                        color: tokens.cardText as any,
                        fontSize: 12,
                        lineHeight: 16,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                      numberOfLines={3}
                    >
                      {it.desc}
                    </Text>
                  ) : null}

                  <View style={{ height: 10 }} />

                  <Pressable
                    onPress={() =>
                      isEquipped
                        ? void unequipOwnedCompanion()
                        : void equipOwnedCompanion(
                            it.id
                          )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      isEquipped
                        ? "Unequip"
                        : "Equip"
                    } ${it.title}`}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isEquipped
                        ? "#FACC15"
                        : CATEGORY_BORDER.tangibles,
                      backgroundColor: pressed
                        ? isEquipped
                          ? "rgba(250,204,21,0.22)"
                          : "rgba(56,189,248,0.22)"
                        : isEquipped
                        ? "rgba(250,204,21,0.12)"
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: isEquipped
                          ? "#FACC15"
                          : CATEGORY_BORDER.tangibles,
                        fontWeight: "800",
                      }}
                    >
                      {isEquipped
                        ? "Unequip Companion"
                        : "Equip Companion"}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}
          </Section>
        )}'''

    text = replace_once(
        text,
        old_block,
        new_block,
        "Purchases companion cards",
    )

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
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length) {
    failed = true;
    console.error(`Syntax errors in ${file}:`);
    for (const error of errors) {
      console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    }
  }
}
process.exit(failed ? 1 : 0);
'''

    with tempfile.TemporaryDirectory(prefix="nova-companion-unequip-") as temp:
        temp_root = Path(temp)
        targets: list[str] = []
        for index, (path, content) in enumerate(files.items()):
            target = temp_root / f"{index}-{path.name}"
            target.write_text(content, encoding="utf-8")
            targets.append(str(target))

        result = subprocess.run(
            ["node", "-e", node_script, *targets],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        if result.returncode != 0:
            raise PatchError(
                result.stderr.strip()
                or result.stdout.strip()
                or "Unknown syntax error"
            )


def backup(paths: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    directory = ROOT / "backups"
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / f"before_companion_unequip_{stamp}.zip"
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, path.relative_to(ROOT))
    return output


def main() -> int:
    try:
        shop_original = read_required(SHOP)
        purchases_original = read_required(PURCHASES)
        updated = {
            SHOP: patch_shop(shop_original),
            PURCHASES: patch_purchases(purchases_original),
        }
        syntax_check(updated)
        backup_path = backup([SHOP, PURCHASES])
        for path, content in updated.items():
            path.write_text(content, encoding="utf-8")

        print("✅ Companion unequip controls installed.")
        print("✅ Added Shop > No Companion button.")
        print("✅ Equipped companions now toggle off when tapped.")
        print("✅ Purchases > Companions now supports Equip / Unequip.")
        print("✅ Floating companion clears immediately.")
        print("✅ Legendary passive powers and island landmarks are unchanged.")
        print("✅ Syntax check passed.")
        print(f"✅ Backup: {backup_path.relative_to(ROOT)}")
        print()
        print("Next command: npx expo start --dev-client --clear")
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

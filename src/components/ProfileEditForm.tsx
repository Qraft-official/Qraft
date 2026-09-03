"use client";

import {
  AVATAR_EMOJIS,
  BANNER_PRESETS,
  PREMIUM_ACCENTS,
  PREMIUM_BANNER_PRESETS,
  PREMIUM_TITLES,
  TITLE_CATALOG,
} from "@/lib/constants";
import type { Tiers } from "@/lib/types";
import { DISPLAY_NAME_MAX, displayNameError } from "@/lib/display-name";
import { HANDLE_HINT, HANDLE_MAX, handleValidationError, sanitizeHandleInput } from "@/lib/handle";
import { fetchHandleChangeStatus, formatHandleNextDate, type HandleChangeStatus } from "@/lib/auth";
import { ageForSave, needsGuardianConsent } from "@/lib/guardian-consent";
import { isImageSrc, useApp } from "@/lib/store";
import { useEffect, useId, useState } from "react";
import { ImageUploadSection } from "./ImageUploadSection";
import { AgePicker, SubjectLevelPickers } from "./LearningSettings";
import { GuardianConsentCheckbox } from "./GuardianConsentCheckbox";
import { UserAvatar } from "./UserAvatar";

export function ProfileEditForm({
  onSaved,
  compact,
}: {
  onSaved?: () => void;
  compact?: boolean;
}) {
  const { me, updateProfile, updateLearningSettings, hasPremium, accentColor, setAccentColor, openPaywall } =
    useApp();
  const [name, setName] = useState(me.name);
  const [handle, setHandle] = useState(me.handle);
  const [bio, setBio] = useState(me.bio);
  const [school, setSchool] = useState(me.school);
  const [avatar, setAvatar] = useState(me.avatar);
  const [banner, setBanner] = useState(me.banner);
  const [activeTitles, setActiveTitles] = useState<string[]>(me.activeTitles);
  const [age, setAge] = useState<number | null>(me.age);
  const [tiers, setTiers] = useState<Tiers>(me.tiers);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [handleStatus, setHandleStatus] = useState<HandleChangeStatus | null>(null);
  const consentFieldId = useId();

  useEffect(() => {
    setName(me.name);
    setHandle(me.handle);
    setBio(me.bio);
    setSchool(me.school);
    setAvatar(me.avatar);
    setBanner(me.banner);
    setActiveTitles(me.activeTitles);
    setAge(me.age);
    setTiers(me.tiers);
    setSaveError("");
    setConsent(false);
  }, [me]);

  useEffect(() => {
    void fetchHandleChangeStatus(me.id).then(setHandleStatus);
  }, [me.id]);

  const readFile = (file: File, cb: (url: string) => void) => {
    const r = new FileReader();
    r.onload = () => cb(String(r.result));
    r.readAsDataURL(file);
  };

  const toggleTitle = (t: string) => {
    setActiveTitles((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return [...prev.slice(1), t];
      return [...prev, t];
    });
  };

  return (
    <div className={compact ? "" : "space-y-1"}>
      <div className="mb-4 flex items-center gap-3">
        <UserAvatar user={{ ...me, avatar }} className="h-16 w-16 text-2xl" />
        <div className="flex flex-wrap gap-1">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setAvatar(e)}
              className={`h-9 w-9 rounded-full text-lg ${avatar === e ? "ring-2 ring-aha" : "bg-white/5"}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <ImageUploadSection
        isPremium={hasPremium}
        label="アバター画像をアップロード"
        onFile={(f) => readFile(f, setAvatar)}
        preview={isImageSrc(avatar) ? avatar : undefined}
      />

      <p className="mb-1 mt-4 text-xs text-muted">バナー</p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {BANNER_PRESETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBanner(b)}
            className={`h-10 rounded-lg bg-gradient-to-r ${b} ${banner === b ? "ring-2 ring-aha" : ""}`}
          />
        ))}
      </div>
      <p className="mb-1 text-xs text-muted">
        Premium バナー {!hasPremium && <span className="text-amber-300">ロック</span>}
      </p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {PREMIUM_BANNER_PRESETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              if (!hasPremium) {
                openPaywall("上級バナーは Qraft Premium（月額¥400）限定です。");
                return;
              }
              setBanner(b);
            }}
            className={`h-10 rounded-lg bg-gradient-to-r ${b} ${banner === b ? "ring-2 ring-amber-400" : ""} ${
              hasPremium ? "" : "opacity-50"
            }`}
          />
        ))}
      </div>
      <p className="mb-1 text-xs text-muted">
        アクセントカラー {!hasPremium && <span className="text-amber-300">Premium</span>}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {PREMIUM_ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              if (!hasPremium) {
                openPaywall("アクセントカラーは Qraft Premium（月額¥400）限定です。");
                return;
              }
              setAccentColor(c);
            }}
            className="h-8 w-8 rounded-full border-2"
            style={{
              background: c,
              borderColor: accentColor === c ? "#fff" : "transparent",
            }}
          />
        ))}
      </div>
      <div className="mb-4">
        <ImageUploadSection
          isPremium={hasPremium}
          label="バナー画像をアップロード"
          onFile={(f) => readFile(f, setBanner)}
          preview={isImageSrc(banner) ? banner : undefined}
        />
      </div>

      <Field
        label="表示名"
        value={name}
        onChange={setName}
        maxLength={DISPLAY_NAME_MAX}
        hint={`2〜${DISPLAY_NAME_MAX}文字`}
      />
      <Field
        label="アカウントID"
        value={handle}
        onChange={(v) => setHandle(v === me.handle ? v : sanitizeHandleInput(v))}
        prefix="@"
        hint={HANDLE_HINT}
        maxLength={HANDLE_MAX}
        disabled={Boolean(handleStatus && handleStatus.remaining <= 0)}
      />
      {handleStatus && handleStatus.remaining <= 0 && handleStatus.nextAt && (
        <p className="mb-3 text-[11px] text-amber-300">
          アカウントIDの変更は2週間に2回までです。次回は {formatHandleNextDate(handleStatus.nextAt)}{" "}
          以降に変更できます。
        </p>
      )}
      {handleStatus && handleStatus.remaining > 0 && handleStatus.used > 0 && (
        <p className="mb-3 text-[11px] text-muted">
          直近2週間のID変更: {handleStatus.used}/2回（残り {handleStatus.remaining} 回）
        </p>
      )}
      <Field label="学校 / クラス" value={school} onChange={setSchool} placeholder="明星高専 2年B組" />
      <label className="mb-3 block text-xs text-muted">
        自己紹介
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 h-20 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm text-white outline-none"
        />
      </label>

      <p className="mb-2 text-xs text-muted">アクティブ称号（最大3）</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {[...TITLE_CATALOG, ...(hasPremium ? PREMIUM_TITLES : [])].map((t) => {
          const on = activeTitles.includes(t);
          const gold = PREMIUM_TITLES.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (gold && !hasPremium) {
                  openPaywall("ゴールド称号は Qraft Premium（月額¥400）限定です。");
                  return;
                }
                toggleTitle(t);
              }}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                on
                  ? gold
                    ? "bg-amber-400 text-black"
                    : "bg-aha text-black"
                  : "border border-gray-700 text-muted"
              }`}
            >
              {gold ? t : `🏆 ${t}`}
            </button>
          );
        })}
      </div>
      {!hasPremium && (
        <button
          type="button"
          onClick={() => openPaywall("限定ゴールド称号は Qraft Premium（月額¥400）です。")}
          className="mb-4 text-left text-[11px] text-amber-300"
        >
          👑 ゴールド称号を解除する
        </button>
      )}

      <div className="mb-4 space-y-4">
        <p className="text-sm font-bold">学習設定</p>
        <AgePicker age={age} onChange={setAge} />
        {needsGuardianConsent(age) && (
          <GuardianConsentCheckbox
            id={consentFieldId}
            checked={consent}
            onChange={setConsent}
          />
        )}
        <SubjectLevelPickers tiers={tiers} onChange={setTiers} />
      </div>

      <button
        type="button"
        disabled={saving || (needsGuardianConsent(age) && !consent)}
        onClick={() => {
          void (async () => {
            if (needsGuardianConsent(age) && !consent) {
              setSaveError("15歳未満の方は、保護者の同意確認にチェックしてください");
              return;
            }
            const nameErr = displayNameError(name);
            if (nameErr) {
              setSaveError(nameErr);
              return;
            }
            const rawHandle = handle.trim().replace(/^@+/, "");
            const nextHandle = rawHandle === me.handle ? me.handle : sanitizeHandleInput(rawHandle) || me.handle;
            if (rawHandle !== me.handle) {
              const handleErr = handleValidationError(nextHandle);
              if (handleErr) {
                setSaveError(handleErr);
                return;
              }
            }
            const nextAge = ageForSave(age);
            setSaveError("");
            setSaving(true);
            const profileRes = await updateProfile({
              name: name.trim() || me.name,
              handle: nextHandle,
              bio,
              school,
              avatar,
              banner,
              activeTitles,
              titles: Array.from(new Set([...me.titles, ...activeTitles])),
              age: nextAge,
            });
            if (profileRes.error) {
              setSaving(false);
              setSaveError(profileRes.error);
              return;
            }
            const learn = await updateLearningSettings({ age: nextAge, tiers });
            setSaving(false);
            if (learn.error) {
              setSaveError(learn.error);
              return;
            }
            const status = await fetchHandleChangeStatus(me.id);
            setHandleStatus(status);
            setSaved("保存しました");
            window.setTimeout(() => setSaved(""), 2000);
            onSaved?.();
          })();
        }}
        className="w-full rounded-full bg-white py-3 text-sm font-bold text-black disabled:opacity-40"
      >
        {saving ? "保存中…" : "保存"}
      </button>
      {saveError && <p className="mt-2 text-center text-xs text-red-400">{saveError}</p>}
      {saved && <p className="mt-2 text-center text-xs text-aha">{saved}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  placeholder,
  hint,
  disabled,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="mb-3 block text-xs text-muted">
      {label}
      <div
        className={`mt-1 flex items-center rounded-xl border border-gray-800 bg-panel px-3 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {prefix && <span className="text-sm text-muted">{prefix}</span>}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          disabled={disabled}
          maxLength={maxLength}
          className="w-full bg-transparent py-2 text-sm text-white outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && <span className="mt-1 block text-[10px] text-muted">{hint}</span>}
    </label>
  );
}

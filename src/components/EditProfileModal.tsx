"use client";

import {
  AVATAR_EMOJIS,
  BANNER_PRESETS,
  PREMIUM_ACCENTS,
  PREMIUM_BANNER_PRESETS,
  PREMIUM_TITLES,
  TITLE_CATALOG,
} from "@/lib/constants";
import { isImageSrc, useApp } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageUploadSection } from "./ImageUploadSection";
import { UserAvatar } from "./UserAvatar";

export function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { me, updateProfile, hasPremium, accentColor, setAccentColor, openPaywall } = useApp();
  const [name, setName] = useState(me.name);
  const [handle, setHandle] = useState(me.handle);
  const [bio, setBio] = useState(me.bio);
  const [school, setSchool] = useState(me.school);
  const [avatar, setAvatar] = useState(me.avatar);
  const [banner, setBanner] = useState(me.banner);
  const [activeTitles, setActiveTitles] = useState<string[]>(me.activeTitles);

  useEffect(() => {
    if (!open) return;
    setName(me.name);
    setHandle(me.handle);
    setBio(me.bio);
    setSchool(me.school);
    setAvatar(me.avatar);
    setBanner(me.banner);
    setActiveTitles(me.activeTitles);
  }, [open, me]);

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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-gray-800 bg-black p-4 sm:rounded-3xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">プロフィールを編集</p>
              <button onClick={onClose} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <UserAvatar user={{ ...me, avatar }} className="h-16 w-16 text-2xl" />
              <div className="flex flex-wrap gap-1">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
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
                  onClick={() => setBanner(b)}
                  className={`h-10 rounded-lg bg-gradient-to-r ${b} ${banner === b ? "ring-2 ring-aha" : ""}`}
                />
              ))}
            </div>
            <p className="mb-1 text-xs text-muted">
              Premium バナー{" "}
              {!hasPremium && <span className="text-amber-300">ロック</span>}
            </p>
            <div className="mb-2 grid grid-cols-3 gap-2">
              {PREMIUM_BANNER_PRESETS.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    if (!hasPremium) {
                      openPaywall("上級バナーは Aha! Premium（月額¥300）限定です。");
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
                  onClick={() => {
                    if (!hasPremium) {
                      openPaywall("アクセントカラーは Aha! Premium（月額¥300）限定です。");
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

            <Field label="表示名" value={name} onChange={setName} />
            <Field label="ハンドル" value={handle} onChange={(v) => setHandle(v.replace(/^@/, ""))} prefix="@" />
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
                    onClick={() => {
                      if (gold && !hasPremium) {
                        openPaywall("ゴールド称号は Aha! Premium（月額¥300）限定です。");
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
                onClick={() => openPaywall("限定ゴールド称号は Aha! Premium（月額¥300）です。")}
                className="mb-4 text-left text-[11px] text-amber-300"
              >
                👑 ゴールド称号を解除する
              </button>
            )}

            <button
              onClick={() => {
                updateProfile({
                  name: name.trim() || me.name,
                  handle: handle.trim() || me.handle,
                  bio,
                  school,
                  avatar,
                  banner,
                  activeTitles,
                  titles: Array.from(new Set([...me.titles, ...activeTitles])),
                });
                onClose();
              }}
              className="w-full rounded-full bg-white py-3 text-sm font-bold text-black"
            >
              保存
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block text-xs text-muted">
      {label}
      <div className="mt-1 flex items-center rounded-xl border border-gray-800 bg-panel px-3">
        {prefix && <span className="text-sm text-muted">{prefix}</span>}
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 text-sm text-white outline-none"
        />
      </div>
    </label>
  );
}

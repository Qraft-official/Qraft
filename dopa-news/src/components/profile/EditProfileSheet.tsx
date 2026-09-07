"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import BottomSheet from "@/components/ui/BottomSheet";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function EditProfileSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user, profile } = useSession();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [open, profile]);

  async function upload(file: File) {
    if (!user) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast("PNG / JPEG / WebP の画像を選んでください", "error");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast("画像サイズは2MBまでです", "error");
      return;
    }
    setUploading(true);
    try {
      const supabase = getSupabase();
      const extension = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast("画像をアップロードしました", "success");
    } catch {
      toast("画像をアップロードできませんでした", "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user || saving) return;
    const trimmed = username.trim();
    if (trimmed.length === 0) {
      toast("ユーザー名を入力してください", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("profiles")
        .update({
          username: trimmed.slice(0, 24),
          bio: bio.trim().slice(0, 160) || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast("プロフィールを更新しました", "success");
      onSaved();
      onClose();
    } catch {
      toast("保存できませんでした", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="プロフィールを編集">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative"
          aria-label="プロフィール画像を変更"
        >
          <Avatar url={avatarUrl} name={username || "ユーザー"} size={72} />
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-line bg-ink-700 text-fg-muted">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-fg">プロフィール画像</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
            PNG / JPEG / WebP、2MBまで。タップして選択します。
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-bold text-fg-muted">ユーザー名</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.slice(0, 24))}
          className="mt-1.5 w-full rounded-2xl border border-line bg-ink-700 px-4 py-3 text-[15px] text-fg outline-none focus:border-[#4ef5a3]/50"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[12.5px] font-bold text-fg-muted">自己紹介</span>
        <textarea
          value={bio}
          rows={3}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          placeholder="どんなニュースに興味がありますか？"
          className="mt-1.5 w-full resize-none rounded-2xl border border-line bg-ink-700 px-4 py-3 text-[14px] leading-relaxed text-fg outline-none placeholder:text-fg-faint focus:border-[#4ef5a3]/50"
        />
        <span className="mt-1 block text-right text-[10.5px] text-fg-faint">{bio.length} / 160</span>
      </label>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || uploading}
        className="grad-cta mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-[#07121a] active:opacity-90 disabled:opacity-50"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        保存する
      </button>
    </BottomSheet>
  );
}

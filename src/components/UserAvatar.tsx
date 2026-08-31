"use client";

import { isImageSrc } from "@/lib/store";
import type { User } from "@/lib/types";

export function UserAvatar({
  user,
  className = "h-11 w-11 text-lg",
}: {
  user: User;
  className?: string;
}) {
  if (isImageSrc(user.avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt={user.name}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ boxShadow: `0 0 0 1px ${user.accent}55` }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ background: `${user.accent}33`, boxShadow: `0 0 0 1px ${user.accent}55` }}
    >
      {user.avatar}
    </div>
  );
}

export function UserBanner({
  user,
  className = "h-28",
}: {
  user: User;
  className?: string;
}) {
  if (isImageSrc(user.banner)) {
    return (
      <div
        className={`${className} bg-cover bg-center`}
        style={{ backgroundImage: `url(${user.banner})` }}
      />
    );
  }
  return <div className={`${className} bg-gradient-to-r ${user.banner}`} />;
}

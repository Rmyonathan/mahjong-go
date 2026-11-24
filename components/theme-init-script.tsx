"use client"

import { useServerInsertedHTML } from "next/navigation"

const STORAGE_KEY = "mahjong-go-theme"

/** Injects theme boot script into the SSR HTML stream (not the client React tree). */
export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script
      id="theme-init"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var t=s==='dark'?'dark':'light';var r=document.documentElement;if(t==='dark')r.classList.add('dark');else r.classList.remove('dark');r.style.colorScheme=t}catch(e){}})();`,
      }}
    />
  ))
  return null
}

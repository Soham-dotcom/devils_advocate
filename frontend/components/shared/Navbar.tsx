"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import GooeyNav from "./GooeyNav";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = [
    { label: "Home", href: "/#hero" },
    { label: "Analysis", href: "/#analysis" },
    { label: "Process", href: "/#process" },
    { label: "Start", href: "/#cta" }
  ];

  useEffect(() => {
    if (pathname !== "/") {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(0);

    const sections = ["hero", "analysis", "process", "cta"];
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveIndex(i);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const isAppPage = 
    pathname === "/submit" || 
    pathname?.startsWith("/analyze") || 
    pathname?.startsWith("/results");

  if (isAppPage) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 h-16 bg-ink/80 backdrop-blur-md border-b border-rule/80 z-50 flex items-center justify-between px-6 select-none">
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-file/80 hover:text-parchment h-9 px-3 text-parchment-dim font-sans cursor-pointer active:scale-98"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Back</span>
            </button>
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-xs font-bold tracking-[0.3em] text-parchment uppercase font-mono">
              DEVIL'S ADVOCATE
            </span>
          </div>
          <div className="flex-1" />
        </header>
        <div className="h-20 w-full" />
      </>
    );
  }

  return (
    <>
      <GooeyNav
        items={navItems}
        particleCount={8}
        particleDistances={[45, 5]}
        particleR={40}
        animationTime={500}
        timeVariance={200}
        initialActiveIndex={activeIndex}
      />
      {pathname !== "/" && <div className="h-24 w-full" />}
    </>
  );
}




